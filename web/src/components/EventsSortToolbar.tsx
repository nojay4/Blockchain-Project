"use client";

import type { EventStatus } from "@/types/sports";

export interface EventsSortToolbarProps {
  sortPrimary: EventStatus;
  onSortPrimaryChange: (value: EventStatus) => void;
}

export function EventsSortToolbar({
  sortPrimary,
  onSortPrimaryChange,
}: EventsSortToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-2">
        <span className="text-muted-foreground">Status order</span>
        <select
          value={sortPrimary}
          onChange={(e) =>
            onSortPrimaryChange(e.target.value as EventStatus)
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="pending">Pending first</option>
          <option value="live">Live first</option>
          <option value="settled">Settled first</option>
        </select>
      </label>
    </div>
  );
}
