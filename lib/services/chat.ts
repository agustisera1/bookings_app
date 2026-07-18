"use server";
import { authorize } from "../authorize";
import { ServiceResult } from "../types";
import * as chatsRepo from "../repositories/chat.mongo";
import * as messagesRepo from "../repositories/messages.mongo";
import * as bookingsRepo from "../repositories/bookings.pg";
import * as listingsRepo from "../repositories/listings.mongo";
import { toMillis } from "../dates";
import type { Booking, BookingParty } from "../types/booking";
import type { ListingDocumentValues } from "../types/listing";
import { ChatHistory, Conversation } from "../types/chat";

/** The only two listing fields a rail row shows. */
type RailListing = Partial<Pick<ListingDocumentValues, "title" | "photos">>;

/**
 * Every conversation the viewer takes part in, for the messages rail.
 *
 * TECH DEBT — this *derives* conversations from bookings instead of reading the
 * chats collection: a booking is a conversation, whether or not anyone wrote in
 * it. That's why rows have no last message, no unread state and no ordering by
 * activity. The real fix is a dedicated `findChatsByParticipant` in
 * `chat.mongo`, which can carry all three; until then a booking with an empty
 * thread still shows up, which is fine (and useful) for testing.
 *
 * TECH DEBT (performance) — three known costs, all deliberate for now:
 *
 *  1. N+1 on the host side. One `getBookingsByListingId` per owned listing, so
 *     a host with 40 listings pays 40 round trips. Collapses into a single
 *     `WHERE listing_id = ANY($1)`, which needs a new repo function.
 *  2. Unbounded. Every booking ever made comes back, and each row renders a
 *     `<Link>` that Next prefetches on viewport entry — so a long history also
 *     means a burst of speculative RSC payloads. Wants a `limit` here plus
 *     `prefetch={false}` on the rows.
 *  3. Blocking. `MessagesLayout` awaits this before painting anything, so the
 *     thread waits on the rail. Wrapping the rail in `<Suspense>` lets the
 *     right pane render first.
 *
 * Two more that live outside this function: `findBookingsByGuestId` does
 * `SELECT *` for the five columns a row needs, and rail thumbnails render
 * through `next/image` with `unoptimized`, i.e. full-size remote photos scaled
 * to 48px. The latter wants `remotePatterns` in `next.config` so the optimizer
 * can do its job.
 */
export async function getUserConversations(): Promise<
  ServiceResult<Conversation[]>
> {
  const auth = await authorize("chat:view-own");
  if (!auth.ok) return auth;
  const { data: user } = auth;

  try {
    // Guest side: the bookings this user made.
    const guestBookings = await bookingsRepo.findBookingsByGuestId(user.id);

    // Host side: the bookings sitting on the listings this user owns. Skipped
    // entirely for a non-host so we don't pay for the lookups. Bookings the
    // user also made themselves are dropped — booking your own listing is legal
    // and would otherwise yield the same conversation twice, once per side.
    const hostListings = user.is_host
      ? await listingsRepo.findListings({ host_id: user.id })
      : [];
    const hostBookings = (
      await Promise.all(
        hostListings.map((listing) =>
          bookingsRepo.getBookingsByListingId(listing._id),
        ),
      )
    )
      .flat()
      .filter((booking) => booking.guest_id !== user.id);

    // One lookup covering every listing the guest side references; the host's
    // own listings are already in hand.
    const guestListings = await listingsRepo.findListingsByIds([
      ...new Set(guestBookings.map((booking) => booking.listing_id)),
    ]);
    // `findListingsByIds` returns raw `Document`s, so the rail's two fields are
    // projected here rather than carrying an untyped doc into the view model.
    // Derived from the listing type instead of re-inlining the shape; optional
    // because a raw document carries no guarantee either field is present.
    const listingById = new Map<string, RailListing>();
    for (const listing of guestListings) {
      listingById.set(String(listing._id), {
        title: listing.title as string | undefined,
        photos: listing.photos as string[] | undefined,
      });
    }
    for (const listing of hostListings) {
      listingById.set(listing._id, {
        title: listing.title,
        photos: listing.photos,
      });
    }

    const toConversation = (
      booking: Booking,
      party: BookingParty,
    ): Conversation => {
      const listing = listingById.get(booking.listing_id);
      return {
        id: booking.id,
        title: listing?.title ?? "Booking",
        photo: listing?.photos?.[0] ?? null,
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: booking.status,
        party,
      };
    };

    const conversations = [
      ...guestBookings.map((booking) => toConversation(booking, "guest")),
      ...hostBookings.map((booking) => toConversation(booking, "host")),
    ].sort((a, b) => toMillis(b.start_date) - toMillis(a.start_date));

    return { ok: true, data: conversations };
  } catch (error) {
    console.error("[getUserConversations]", error);
    return {
      ok: false,
      error: "Could not load your conversations",
      code: "UNEXPECTED",
    };
  }
}

export async function getChatHistory(
  bookingId: string,
): Promise<ServiceResult<ChatHistory>> {
  const auth = await authorize("chat:view-own");
  if (!auth.ok) return auth;

  try {
    const chat = await chatsRepo.findChatByBookingId(bookingId);
    if (!chat) {
      return {
        ok: false,
        error: "Could not find the requested chat",
        code: "UNEXPECTED",
      };
    }

    const messages = await messagesRepo.findMessagesByChatId(bookingId);

    return {
      data: { ...chat, messages },
      ok: true,
    };
  } catch (error) {
    console.error("[getChatHistory]:", error);
    return {
      error: "Could not find the requested chat",
      code: "UNEXPECTED",
      ok: false,
    };
  }
}
