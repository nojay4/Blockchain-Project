import type { Event, EventStatus } from "@/types/sports";

const ALL: EventStatus[] = ["pending", "live", "settled"];

function normalizedStatus(status: string | undefined): string {
  return (status ?? "").toLowerCase().trim();
}

function statusOrderRank(status: string | undefined, order: EventStatus[]): number {
  const s = normalizedStatus(status);
  const idx = order.findIndex((x) => x === s);
  return idx >= 0 ? idx : ALL.length + 1;
}

/** Sort by status priority (primary first, then the other two in default order), then by `date` ascending. */
export function sortEventsByStatus(
  events: Event[],
  primary: EventStatus
): Event[] {
  const rest = ALL.filter((x) => x !== primary);
  const order: EventStatus[] = [primary, ...rest];
  return [...events].sort((a, b) => {
    const ra = statusOrderRank(a.status, order);
    const rb = statusOrderRank(b.status, order);
    if (ra !== rb) return ra - rb;
    return String(a.date).localeCompare(String(b.date));
  });
}
