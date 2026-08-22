/**
 * SETU — Rule-based Recommendation Engine.
 * Priority order: WAIT -> MOVE_COACH -> BOARD_NOW.
 */

import {
  CROWD_LEVEL_LABELS,
  formatPercent,
  type CoachAggregate,
  trainAverageOccupancy,
} from "./decayWeightedEngine";

export const BOARD_NOW_MAX_OCCUPANCY = 0.7;
export const COACH_IMBALANCE_MIN_GAP = 0.15;
export const WAIT_MIN_IMPROVEMENT = 0.15;
export const WAIT_MAX_ETA_MINUTES = 6;

export interface UpcomingTrain {
  trainId: string;
  name: string;
  etaMinutes: number;
  /** 0..1 predicted occupancy — mock/demo data, not an ML model. */
  predictedOccupancy: number;
}

export type RecommendationAction = "WAIT" | "MOVE_COACH" | "BOARD_NOW" | "NO_DATA";

export interface Recommendation {
  action: RecommendationAction;
  headline: string;
  reasoning: string;
  details: Record<string, unknown>;
}

export function recommend(
  aggregates: CoachAggregate[],
  upcomingTrains: UpcomingTrain[] = [],
  selectedCoachId?: string | null,
  /**
   * Optional coach-class lookup. When provided, MOVE_COACH only ever suggests
   * a coach of the same class as the commuter's current coach.
   */
  classOf?: (coachId: string) => string,
): Recommendation {
  const avgOccupancy = trainAverageOccupancy(aggregates);

  if (avgOccupancy === null) {
    return {
      action: "NO_DATA",
      headline: "No live crowd data",
      reasoning:
        "No recent passenger reports for this train. Submit a crowd report to start the live score.",
      details: {},
    };
  }

  // Step 1 — WAIT
  if (avgOccupancy > BOARD_NOW_MAX_OCCUPANCY) {
    const candidates = upcomingTrains
      .filter(
        (t) =>
          t.etaMinutes <= WAIT_MAX_ETA_MINUTES &&
          avgOccupancy - t.predictedOccupancy >= WAIT_MIN_IMPROVEMENT,
      )
      .sort(
        (a, b) =>
          a.predictedOccupancy - b.predictedOccupancy ||
          a.etaMinutes - b.etaMinutes,
      );

    const best = candidates[0];
    if (best) {
      return {
        action: "WAIT",
        headline: `Wait — Train ${best.trainId} in ${Math.round(best.etaMinutes)} min is less crowded`,
        reasoning: `WAIT — Train ${best.trainId} in ${Math.round(best.etaMinutes)} min is less crowded (${formatPercent(
          best.predictedOccupancy,
        )} vs ${formatPercent(avgOccupancy)} now)`,
        details: { avgOccupancy, train: best },
      };
    }
  }

  // Step 2 — MOVE_COACH
  const scored = aggregates.filter(
    (a) => a.status === "SCORED" && a.occupancyScore !== null,
  );
  const bestCoach = [...scored].sort(
    (a, b) => (a.occupancyScore as number) - (b.occupancyScore as number),
  )[0];
  const current = selectedCoachId
    ? scored.find((a) => a.coachId === selectedCoachId)
    : undefined;

  if (
    bestCoach &&
    current &&
    bestCoach.coachId !== current.coachId &&
    (current.occupancyScore as number) - (bestCoach.occupancyScore as number) >=
      COACH_IMBALANCE_MIN_GAP
  ) {
    const bestLabel = CROWD_LEVEL_LABELS[bestCoach.level!];
    const currentLabel = CROWD_LEVEL_LABELS[current.level!];
    return {
      action: "MOVE_COACH",
      headline: `Move to Coach ${bestCoach.coachId} — more space`,
      reasoning: `Move to Coach ${bestCoach.coachId} — more space (${bestLabel} vs ${currentLabel} in your coach)`,
      details: { avgOccupancy, bestCoach, current },
    };
  }

  // Step 3 — BOARD_NOW
  return {
    action: "BOARD_NOW",
    headline: "Board Now",
    reasoning: `Board Now — average occupancy ${formatPercent(avgOccupancy)}`,
    details: { avgOccupancy },
  };
}
