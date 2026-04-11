"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EventsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function visiblePageNumbers(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) set.add(p);
  }
  return Array.from(set).sort((a, b) => a - b);
}

type PageSegment =
  | { kind: "page"; n: number }
  | { kind: "ellipsis"; key: string };

export function EventsPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: EventsPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = visiblePageNumbers(currentPage, totalPages);
  const segments: PageSegment[] = [];
  for (let i = 0; i < pages.length; i++) {
    const n = pages[i];
    if (i > 0 && n - pages[i - 1] > 1) {
      segments.push({ kind: "ellipsis", key: `e-${pages[i - 1]}-${n}` });
    }
    segments.push({ kind: "page", n });
  }

  return (
    <nav
      className={cn(
        "mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6",
        className
      )}
      aria-label="Events pagination"
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 px-1">
          {segments.map((seg) =>
            seg.kind === "ellipsis" ? (
              <span
                key={seg.key}
                className="flex h-9 w-9 items-center justify-center text-muted-foreground"
                aria-hidden
              >
                …
              </span>
            ) : (
              <Button
                key={seg.n}
                type="button"
                variant={seg.n === currentPage ? "default" : "outline"}
                size="sm"
                className="h-9 min-w-9 px-2"
                onClick={() => onPageChange(seg.n)}
                aria-label={`Page ${seg.n}`}
                aria-current={seg.n === currentPage ? "page" : undefined}
              >
                {seg.n}
              </Button>
            )
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        Page {currentPage} of {totalPages}
      </p>
    </nav>
  );
}
