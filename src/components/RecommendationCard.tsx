import { ArrowRightLeft, Check, CircleHelp, Clock } from "lucide-react";
import type { Recommendation } from "@/engine/recommendationEngine";
import { cn } from "@/lib/utils";

const CONFIG = {
  BOARD_NOW: { icon: Check, color: "var(--crowd-low)", tag: "Board Now" },
  WAIT: { icon: Clock, color: "var(--crowd-high)", tag: "Wait" },
  MOVE_COACH: {
    icon: ArrowRightLeft,
    color: "var(--crowd-moderate)",
    tag: "Move Coach",
  },
  NO_DATA: { icon: CircleHelp, color: "var(--crowd-none)", tag: "No Data" },
} as const;

export function RecommendationCard({
  recommendation,
  className,
}: {
  recommendation: Recommendation;
  className?: string;
}) {
  const cfg = CONFIG[recommendation.action];
  const Icon = cfg.icon;

  return (
    <section
      className={cn("card-surface p-5", className)}
      style={{
        borderColor: `color-mix(in oklch, ${cfg.color} 45%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${cfg.color} 7%, var(--card))`,
      }}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Recommendation · rule-based
      </div>
      <div className="mt-3 flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in oklch, ${cfg.color} 18%, transparent)`,
            color: cfg.color,
          }}
        >
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-tight tracking-tight">
            {recommendation.headline}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {recommendation.reasoning}
          </p>
        </div>
      </div>
    </section>
  );
}
