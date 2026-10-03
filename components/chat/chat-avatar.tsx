import { InitialsAvatar } from "@/components/common/initials-avatar";
import type { Counterpart } from "./types";

/** Initial-letter avatar for the counterpart (we have no name, only the role). */
export function ChatAvatar({
  counterpart,
  size,
}: {
  counterpart: Counterpart;
  size: "sm" | "md";
}) {
  return <InitialsAvatar initials={counterpart[0]} size={size} />;
}
