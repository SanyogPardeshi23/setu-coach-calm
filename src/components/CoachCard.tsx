import { CircleAlert, CircleHelp } from "lucide-react";
import {
  formatPercent,
  relativeTime,
  type CoachAggregate,
} from "@/engine/decayWeightedEngine";
import { colorForScore } from "@/lib/crowdUi";
import { CrowdBadge } from "@/components/CrowdBadge";
import { cn } from "@/lib/utils";

export function CoachCard({
  aggregate,
  now,
  selected,
  best,
  onSelect,
}: {
  aggregate: CoachAggregate;
  now: number;
  selected?: boolean;
  best?: boolean;
  onSelect?: (coachId: string) => void;
}) {
  const color = colorForScore(aggregate.occupancyScore);
  const pct =
    aggregate.occupancyScore === null
      ? 0
      : Math.round(aggregate.occupancyScore * 100);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(aggregate.coachId)}
      className={cn(
        "card-surface w-full text-left p-4 transition-all duration-200 active:scale-[0.99]",
        selected
          ? "ring-2 ring-primary shadow-[var(--shadow-lift)]"
          : "hover:shadow-[var(--shadow-lift)]",
        aggregate.lowConfidence && aggregate.status === "SCORED" && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-bold tracking-tight">
            Coach {aggregate.coachId}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {aggregate.numReports} report{aggregate.numReports === 1 ? "" : "s"}
            {aggregate.lastReportAt
              ? ` · last ${relativeTime(aggregate.lastReportAt, now)}`
              : ""}
          </div>
        </div>
        {best && aggregate.status === "SCORED" && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
            Best
          </span>
        )}
      </div>

      {aggregate.status === "SCORED" ? (
        <>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>
              {formatPercent(aggregate.occupancyScore as number)}
            </span>
            <CrowdBadge level={aggregate.level} size="sm" />
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Confidence {Math.round(aggregate.confidence * 100)}%</span>
            {aggregate.lowConfidence && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
                low confidence
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary/70 px-3 py-3 text-xs text-muted-foreground">
          {aggregate.status === "NO_RECENT_DATA" ? (
            <>
              <CircleAlert className="size-4 shrink-0" />
              <span>
                No Recent Data — all reports decayed (last{" "}
                {aggregate.lastReportAt
                  ? relativeTime(aggregate.lastReportAt, now)
                  : "—"}
                )
              </span>
            </>
          ) : (
            <>
              <CircleHelp className="size-4 shrink-0" />
              <span>No Data — nobody has reported this coach yet</span>
            </>
          )}
        </div>
      )}
    </button>
  );
}
