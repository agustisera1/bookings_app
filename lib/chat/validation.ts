import { z } from "zod";

// A chat is keyed by its booking's id.
export const chatIdSchema = z.uuid();
