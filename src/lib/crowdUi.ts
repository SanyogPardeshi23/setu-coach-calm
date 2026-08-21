import { CrowdLevel } from "@/engine/decayWeightedEngine";

export const crowdColorVar: Record<CrowdLevel, string> = {
  [CrowdLevel.EMPTY]: "var(--crowd-low)",
  [CrowdLevel.COMFORTABLE]: "var(--crowd-moderate)",
  [CrowdLevel.CROWDED]: "var(--crowd-high)",
  [CrowdLevel.PACKED]: "var(--crowd-veryhigh)",
};

export const NO_DATA_COLOR = "var(--crowd-none)";

export function colorForScore(score: number | null): string {
  if (score === null) return NO_DATA_COLOR;
  if (score < 0.17) return crowdColorVar[CrowdLevel.EMPTY];
  if (score < 0.5) return crowdColorVar[CrowdLevel.COMFORTABLE];
  if (score < 0.84) return crowdColorVar[CrowdLevel.CROWDED];
  return crowdColorVar[CrowdLevel.PACKED];
}
