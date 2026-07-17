"use server";
import { authorize } from "../authorize";
import { ServiceResult } from "../types";
import * as chatsRepo from "../repositories/chat.mongo";
import * as messagesRepo from "../repositories/messages.mongo";
import { ChatHistory } from "../types/chat";

export async function getChatHistory(
  bookingId: string,
): Promise<ServiceResult<ChatHistory>> {
  const auth = await authorize("bookings:view-own-listings");
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
