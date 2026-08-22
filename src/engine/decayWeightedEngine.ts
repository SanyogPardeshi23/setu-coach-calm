/**
 * SETU — Time-Decay Weighted Crowd Aggregation Engine (frontend port)
 * Pure logic. No UI, no network. A real backend can replace this module
 * without touching any component.
 */

import { GEOFENCE_RADIUS_METERS } from "@/utils/geofence";

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
  /**
   * Distance from the nearest station in meters, when a GPS fix was
   * obtained. `null` = location check attempted but failed/denied.
   * `undefined` = no location data at all (e.g. seeded demo reports) —
   * these get full weight, not the "unknown" penalty, for backward
   * compatibility with data that predates this feature.
   */
  distanceMeters?: number | null;
  /** True while the report is sitting in the offline queue. */
  queued?: boolean;
}

/** 180-second half-life: a report is worth half as much after 3 minutes. */
export const HALF_LIFE_SECONDS = 180;
export const DECAY_RATE = Math.LN2 / HALF_LIFE_SECONDS;
/** Below this total weight every report has effectively decayed away. */
export const MIN_TOTAL_WEIGHT = 0.05;

/**
 * Location-confidence weighting. Mirrors the same exponential-decay
 * technique used for time above, applied to distance instead: a report
 * loses half its location-confidence weight every LOCATION_HALF_LIFE_METERS
 * beyond the verified geofence radius.
 */
export const LOCATION_HALF_LIFE_METERS = 500;
/**
