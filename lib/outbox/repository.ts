import type { Transaction } from "@/lib/infra/postgres";
import { outbox } from "./tables";
import type { OutboxEvent } from "./types";

type Aggregate = { type: "user" | "booking"; id: string };

// Takes the caller's transaction: the event lands with its entity or not at all.
export async function insertOutboxEvent(
  tx: Transaction,
  aggregate: Aggregate,
  event: OutboxEvent,
): Promise<void> {
  await tx.insert(outbox).values({
    aggregate_type: aggregate.type,
    aggregate_id: aggregate.id,
    event_type: event.type,
    payload: event.payload ?? {},
  });
}
