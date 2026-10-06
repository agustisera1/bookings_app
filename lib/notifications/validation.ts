import { z } from "zod";

export const markAsReadSchema = z.object({
  notificationId: z.string().regex(/^[a-f\d]{24}$/i, "Notification not found"),
});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
