"use server";
import { authorize } from "../authorize";
import { ServiceResult } from "../types";
import * as chatsRepo from "../repositories/chat.mongo";
import * as messagesRepo from "../repositories/messages.mongo";
import * as bookingsRepo from "../repositories/bookings.pg";
import * as listingsRepo from "../repositories/listings.mongo";
import { toMillis } from "../dates";
import { signToken } from "../jwt";
import type { Booking, BookingParty, ChatParties } from "../types/booking";
import type { ListingDocumentValues } from "../types/listing";
import type { CurrentUser } from "../types/user";
import { ChatHistory, Conversation } from "../types/chat";

/** The only two listing fields a rail row shows. */
type RailListing = Partial<Pick<ListingDocumentValues, "title" | "photos">>;

/**
 * Every conversation the viewer takes part in, for the messages rail.
 *
 * Derives conversations from bookings rather than the chats collection, so a
 * booking is a conversation whether or not anyone wrote in it — which is why
 * rows carry no last message, no unread state and no ordering by activity.
 * That tradeoff and its costs are written up in
 * `docs/tech_debt/CHAT_FEATURE_NEXT_STEPS.md`; the query costs are items 6–7 of
 * `docs/tech_debt/PERFORMANCE.md`.
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

    const ids = hostListings.map((listing) => listing._id);
    const hostBookings = (
      ids.length === 0 ? [] : await bookingsRepo.getBookingsByListingIds(ids)
    ).filter((booking) => booking.guest_id !== user.id);

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

/**
 * Which side of `bookingId` this user sits on, or `null` if neither — i.e. they
 * have no business reading the thread. Guest is settled by the booking row;
 * host requires the listing, since ownership lives in Mongo. Sole owner of the
 * rule: `getChatHistory` signs the result into the join ticket, which the
 * worker verifies rather than re-deriving.
 */
async function getChatParties(
  bookingId: string,
  user: CurrentUser,
): Promise<ChatParties | null> {
  const booking = await bookingsRepo.getBookingById(bookingId);
  if (!booking) return null;
  const listing = await listingsRepo.findListingById(booking.listing_id);
  if (!listing) return null;
  const isHost = user.id === listing.host_id;
  const isGuest = user.id === booking.guest_id;

  return {
    chat_id: bookingId,
    host_id: listing.host_id,
    guest_id: booking.guest_id,
    current_party: isHost ? "host" : isGuest ? "guest" : null,
  };
}

export async function getChatHistory(
  bookingId: string,
): Promise<ServiceResult<ChatHistory>> {
  const auth = await authorize("chat:view-own");
  if (!auth.ok) return auth;
  const { data: user } = auth;

  try {
    const parties = await getChatParties(bookingId, user);
    if (!parties)
      return {
        ok: false,
        error: "There is no booking or listing associated for the current user",
        code: "VALIDATION",
      };

    if (!parties.current_party)
      return {
        ok: false,
        error: "You are not part of this conversation",
        code: "FORBIDDEN",
      };

    // Sign the join ticket only once the caller is confirmed a party — the
    // worker verifies this signature instead of re-deriving the rule.
    const ticket = signToken(parties, { expiresIn: "1h" });

    // A missing chat document is not an error: it just means nobody has spoken
    // on this booking yet. Reporting it as a failure is what put the UI in its
    // error state — and had it blaming the network — for every fresh thread.
    const chat = await chatsRepo.findChatByBookingId(bookingId);
    const messages = chat
      ? await messagesRepo.findMessagesByChatId(bookingId)
      : [];

    return { ok: true, data: { chat, messages, parties, ticket } };
  } catch (error) {
    console.error("[getChatHistory]:", error);
    return {
      error: "Could not load this conversation",
      code: "UNEXPECTED",
      ok: false,
    };
  }
}
