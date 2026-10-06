import { z } from "zod";

// A chat is keyed by its booking's id.
export const chatIdSchema = z.uuid();

export const threadCursorSchema = z.iso.datetime();

// Mirrored in greenaway-worker/src/chat/validation.ts, which enforces it.
export const MAX_MESSAGE_LENGTH = 2000;
