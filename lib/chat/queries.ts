import { authorize } from "@/lib/auth/session";
import { MAX_BOOKINGS_PER_LIST, partyOf } from "@/lib/bookings/policy";
import * as bookingsRepo from "@/lib/bookings/repository";
import type { Booking, BookingParty } from "@/lib/bookings/types";
import * as listingsRepo from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import type { ServiceResult } from "@/lib/shared/result";
import * as repo from "./repository";
import type { ChatThread, Conversation } from "./types";
import { chatIdSchema } from "./validation";

const MESSAGES_PER_PAGE = 50;
// Cap on a thread widened with `from`: past it, the oldest messages fall off again.
const MAX_THREAD_MESSAGES = 500;

// Derived from bookings, not the chats collection: a booking is a conversation
// whether or not anyone wrote in it, so rows carry no last message or unread state.
export async function getUserConversations(): Promise<ServiceResult<Conversation[]>> {
  const auth = await authorize("chat:view-own");
  if (!auth.ok) return auth;
  const user = auth.data;

  try {
    const guestBookings = await bookingsRepo.findBookingsByGuestId(user.id, MAX_BOOKINGS_PER_LIST);

    // Booking your own listing is legal: dropped here so it isn't listed once per side.
    const hostListings = user.is_host ? await listingsRepo.findListings({ host_id: user.id }) : [];
    const hostBookings = (
      await bookingsRepo.findBookingsByListingIds(
        hostListings.map((listing) => listing._id),
        MAX_BOOKINGS_PER_LIST,
      )
    ).filter((booking) => booking.guest_id !== user.id);

    const guestListings = await listingsRepo.findListingsByIds([
      ...new Set(guestBookings.map((booking) => booking.listing_id)),
    ]);
    const listingById = new Map<string, Listing>(
      [...guestListings, ...hostListings].map((listing) => [listing._id, listing]),
    );

    const toConversation = (booking: Booking, party: BookingParty): Conversation => {
      const listing = listingById.get(booking.listing_id);
      return {
        id: booking.id,
        title: listing?.title ?? "Booking",
        photo: listing?.photos[0] ?? null,
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: booking.status,
        party,
      };
    };

    const conversations = [
      ...guestBookings.map((booking) => toConversation(booking, "guest")),
      ...hostBookings.map((booking) => toConversation(booking, "host")),
    ].sort((a, b) => b.start_date.getTime() - a.start_date.getTime());

    return { ok: true, data: conversations };
  } catch (error) {
    console.error("[getUserConversations]", error);
    return { ok: false, error: "Could not load your conversations", code: "UNEXPECTED" };
  }
}

// Messages received since the user last opened the inbox (the read cursor).
export async function getUnreadMessagesCount(): Promise<ServiceResult<number>> {
  const auth = await authorize("chat:view-own");
  if (!auth.ok) return auth;
  const user = auth.data;

  try {
    // Chats are born with their first message: no chats, nothing to count.
    const chatIds = await repo.findChatIdsByUserId(user.id);
    if (chatIds.length === 0) return { ok: true, data: 0 };

    const since = await repo.findReadCursor(user.id);
    return { ok: true, data: await repo.countMessagesSince(chatIds, user.id, since) };
  } catch (error) {
    console.error("[getUnreadMessagesCount]", error);
    return { ok: false, error: "Could not load your unread messages", code: "UNEXPECTED" };
  }
}

// A thread the caller isn't party to reads as NOT_FOUND: never confirms the booking exists.
export async function getChatThread(
  bookingId: string,
  from: Date | null,
): Promise<ServiceResult<ChatThread>> {
  const auth = await authorize("chat:view-own");
  if (!auth.ok) return auth;

  const notFound = { ok: false, error: "Conversation not found", code: "NOT_FOUND" } as const;
  if (!chatIdSchema.safeParse(bookingId).success) return notFound;

  try {
    const booking = await bookingsRepo.findBookingById(bookingId);
    if (!booking) return notFound;

    const listing = await listingsRepo.findListingById(booking.listing_id);
    const party = partyOf(booking, auth.data.id, listing?.host_id);
    if (!party) return notFound;

    const chat = await repo.findChatByBookingId(bookingId);
    if (!chat) return { ok: true, data: { chat, messages: { items: [], olderCursor: null }, party } };

    const items = await repo.findMessagesByChatId(
      bookingId,
      from,
      from ? MAX_THREAD_MESSAGES : MESSAGES_PER_PAGE,
    );
    const olderCursor = items.length
      ? await repo.findOlderCursor(bookingId, items[0].timestamp, MESSAGES_PER_PAGE)
      : null;
    return { ok: true, data: { chat, messages: { items, olderCursor }, party } };
  } catch (error) {
    console.error("[getChatThread]", error);
    return { ok: false, error: "Could not load this conversation", code: "UNEXPECTED" };
  }
}
