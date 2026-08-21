import { CROWD_LEVEL_LABELS, CrowdLevel } from "@/engine/decayWeightedEngine";
import { crowdColorVar } from "@/lib/crowdUi";
import { cn } from "@/lib/utils";

export function CrowdBadge({
  level,
  className,
  size = "md",
}: {
  level: CrowdLevel | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const color = level === null ? "var(--crowd-none)" : crowdColorVar[level];
  const label = level === null ? "No data" : CROWD_LEVEL_LABELS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
      style={{
        color,
        backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
