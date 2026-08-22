/**
 * SETU — Time-Decay Weighted Crowd Aggregation Engine (frontend port)
 * Pure logic. No UI, no network. A real backend can replace this module
 * without touching any component.
 */

export enum CrowdLevel {
  EMPTY = 0,
  COMFORTABLE = 1,
  CROWDED = 2,
  PACKED = 3,
}

export const MAX_LEVEL = 3;

export const CROWD_LEVEL_LABELS: Record<CrowdLevel, string> = {
  [CrowdLevel.EMPTY]: "Low",
  [CrowdLevel.COMFORTABLE]: "Moderate",
  [CrowdLevel.CROWDED]: "High",
  [CrowdLevel.PACKED]: "Very High",
};

export const CROWD_LEVEL_DESCRIPTIONS: Record<CrowdLevel, string> = {
  [CrowdLevel.EMPTY]: "Plenty of space",
  [CrowdLevel.COMFORTABLE]: "Comfortably occupied",
  [CrowdLevel.CROWDED]: "Difficult to move",
  [CrowdLevel.PACKED]: "Extremely crowded",
};

/** Normalize a discrete level to a 0..1 occupancy score. */
export function levelScore(level: CrowdLevel): number {
  return level / MAX_LEVEL;
}

/** Map a 0..1 occupancy score back to the nearest discrete level. */
export function scoreToLevel(score: number): CrowdLevel {
  return Math.round(Math.max(0, Math.min(1, score)) * MAX_LEVEL) as CrowdLevel;
}

export interface CrowdReport {
  id: string;
  trainId: string;
  coachId: string;
  level: CrowdLevel;
  /** unix ms */
  timestamp: number;
  userId: string;
  userTrustScore: number;
  /** Demo proximity check result (see src/utils/geofence.ts). */
  locationVerified?: boolean;
  /** True while the report is sitting in the offline queue. */
  queued?: boolean;
}

/** 180-second half-life: a report is worth half as much after 3 minutes. */
export const HALF_LIFE_SECONDS = 180;
export const DECAY_RATE = Math.LN2 / HALF_LIFE_SECONDS;
/** Below this total weight every report has effectively decayed away. */
export const MIN_TOTAL_WEIGHT = 0.05;

export type CoachStatus = "SCORED" | "NO_RECENT_DATA" | "NO_DATA";



export function reportWeight(report: CrowdReport, now: number): number {
  const secondsSince = Math.max(0, (now - report.timestamp) / 1000);
  return Math.exp(-DECAY_RATE * secondsSince) * report.userTrustScore;
}

export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function aggregateCoach(
  coachId: string,
  reports: CrowdReport[],
  now: number = Date.now(),
): CoachAggregate {
  if (reports.length === 0) {
    return {
      coachId,
      status: "NO_DATA",
      occupancyScore: null,
      level: null,
      label: null,
      totalWeight: 0,
      numReports: 0,
      confidence: 0,
      lowConfidence: true,
      lastReportAt: null,
    };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  let lastReportAt = 0;
  let validCount = 0;

  for (const report of reports) {
    const w = reportWeight(report, now);
    const lvl = levelScore(report.level);
    if (
      !Number.isFinite(w) ||
      !Number.isFinite(lvl) ||
      !Number.isFinite(report.timestamp)
    ) {
      continue;
    }
    validCount += 1;
    totalWeight += w;
    weightedSum += w * lvl;
    lastReportAt = Math.max(lastReportAt, report.timestamp);
  }

  const confidence =
    validCount === 0
      ? 0
      : Math.min(1, totalWeight / validCount) * Math.min(1, validCount / 3);

  if (validCount === 0 || totalWeight < MIN_TOTAL_WEIGHT) {
    return {
      coachId,
      status: "NO_RECENT_DATA",
      occupancyScore: null,
      level: null,
      label: null,
      totalWeight,
      numReports: validCount,
      confidence,
      lowConfidence: true,
      lastReportAt: lastReportAt || null,
    };
  }

  const occupancyScore = weightedSum / totalWeight;
  const level = scoreToLevel(occupancyScore);

  return {
    coachId,
    status: "SCORED",
    occupancyScore,
    level,
    label: CROWD_LEVEL_LABELS[level],
    totalWeight,
    numReports: validCount,
    confidence,
    lowConfidence: confidence < LOW_CONFIDENCE_THRESHOLD,
    lastReportAt,
  };
}

  const confidence =
    Math.min(1, totalWeight / numReports) * Math.min(1, numReports / 3);

  if (totalWeight < MIN_TOTAL_WEIGHT) {
    return {
      coachId,
      status: "NO_RECENT_DATA",
      occupancyScore: null,
      level: null,
      label: null,
      totalWeight,
      numReports,
      confidence,
      lowConfidence: true,
      lastReportAt,
    };
  }

  const occupancyScore = weightedSum / totalWeight;
  const level = scoreToLevel(occupancyScore);

  return {
    coachId,
    status: "SCORED",
    occupancyScore,
    level,
    label: CROWD_LEVEL_LABELS[level],
    totalWeight,
    numReports,
    confidence,
    lowConfidence: confidence < LOW_CONFIDENCE_THRESHOLD,
    lastReportAt,
  };
}

/** Aggregate every coach of a train. Coaches with no reports return NO_DATA. */
export function aggregateTrain(
  coachIds: string[],
  reports: CrowdReport[],
  trainId: string,
  now: number = Date.now(),
): CoachAggregate[] {
  return coachIds.map((coachId) =>
    aggregateCoach(
      coachId,
      reports.filter((r) => r.trainId === trainId && r.coachId === coachId),
      now,
    ),
  );
}

/** Average occupancy across coaches that currently have live data. */
export function trainAverageOccupancy(
  aggregates: CoachAggregate[],
): number | null {
  const scored = aggregates.filter(
    (a) => a.status === "SCORED" && a.occupancyScore !== null,
  );
  if (scored.length === 0) return null;
  return (
    scored.reduce((sum, a) => sum + (a.occupancyScore as number), 0) /
    scored.length
  );
}

export function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - timestamp) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
