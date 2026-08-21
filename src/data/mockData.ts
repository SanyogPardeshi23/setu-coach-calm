/**
 * SETU — Mock / demo data only.
 * Replace this file with real API calls later; the UI reads only from
 * the store + engines, never from a network client directly.
 */

import { CrowdLevel, type CrowdReport } from "@/engine/decayWeightedEngine";
import type { UpcomingTrain } from "@/engine/recommendationEngine";

export interface Station {
  id: string;
  name: string;
  line: string;
}

export interface Train {
  id: string;
  name: string;
  line: string;
  direction: string;
  departureIn: number; // minutes
  coaches: string[];
}

export const STATIONS: Station[] = [
  { id: "DDR", name: "Dadar", line: "Western Line" },
  { id: "BA", name: "Bandra", line: "Western Line" },
  { id: "ADH", name: "Andheri", line: "Western Line" },
  { id: "BO", name: "Borivali", line: "Western Line" },
  { id: "CSMT", name: "CSMT", line: "Central Line" },
  { id: "TNA", name: "Thane", line: "Central Line" },
];

export const COACHES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"];

export const TRAINS: Train[] = [
  {
    id: "90512",
    name: "Churchgate — Borivali Slow",
    line: "Western Line",
    direction: "Northbound",
    departureIn: 2,
    coaches: COACHES,
  },
  {
    id: "90518",
    name: "Churchgate — Virar Fast",
    line: "Western Line",
    direction: "Northbound",
    departureIn: 5,
    coaches: COACHES,
  },
  {
    id: "90524",
    name: "Churchgate — Bhayandar Slow",
    line: "Western Line",
    direction: "Northbound",
    departureIn: 9,
    coaches: COACHES,
  },
];

export interface MockUser {
  id: string;
  name: string;
  trustScore: number;
}

export const CURRENT_USER_ID = "u-you";

export const MOCK_USERS: MockUser[] = [
  { id: CURRENT_USER_ID, name: "You (demo commuter)", trustScore: 1.0 },
  { id: "u-1042", name: "Commuter 1042", trustScore: 1.22 },
  { id: "u-2087", name: "Commuter 2087", trustScore: 0.78 },
  { id: "u-3311", name: "Commuter 3311", trustScore: 1.05 },
  { id: "u-4590", name: "Commuter 4590", trustScore: 0.93 },
  { id: "u-5123", name: "Commuter 5123", trustScore: 1.34 },
];

/** Upcoming trains with mock predicted occupancy (NOT an ML prediction). */
export const UPCOMING_TRAINS: Record<string, UpcomingTrain[]> = {
  "90512": [
    {
      trainId: "90518",
      name: "Churchgate — Virar Fast",
      etaMinutes: 5,
      predictedOccupancy: 0.52,
    },
    {
      trainId: "90524",
      name: "Churchgate — Bhayandar Slow",
      etaMinutes: 9,
      predictedOccupancy: 0.41,
    },
  ],
  "90518": [
    {
      trainId: "90524",
      name: "Churchgate — Bhayandar Slow",
      etaMinutes: 4,
      predictedOccupancy: 0.44,
    },
  ],
  "90524": [
    {
      trainId: "90512",
      name: "Churchgate — Borivali Slow",
      etaMinutes: 6,
      predictedOccupancy: 0.6,
    },
  ],
};

let seedCounter = 0;
function makeReport(
  trainId: string,
  coachId: string,
  level: CrowdLevel,
  secondsAgo: number,
  userId: string,
  trust: number,
  now: number,
): CrowdReport {
  seedCounter += 1;
  return {
    id: `seed-${seedCounter}`,
    trainId,
    coachId,
    level,
    timestamp: now - secondsAgo * 1000,
    userId,
    userTrustScore: trust,
  };
}

/**
 * Seeded reports, generated relative to "now" so the demo always shows
 * a mix of fresh, decaying and fully stale data.
 */
export function seedReports(now: number = Date.now()): CrowdReport[] {
  const plan: Array<[string, CrowdLevel, number, string]> = [
    // coach, level, secondsAgo, userId
    ["C1", CrowdLevel.PACKED, 25, "u-1042"],
    ["C1", CrowdLevel.PACKED, 70, "u-2087"],
    ["C1", CrowdLevel.CROWDED, 140, "u-3311"],
    ["C2", CrowdLevel.PACKED, 40, "u-5123"],
    ["C2", CrowdLevel.CROWDED, 95, "u-4590"],
    ["C3", CrowdLevel.CROWDED, 30, "u-1042"],
    ["C3", CrowdLevel.CROWDED, 110, "u-3311"],
    ["C3", CrowdLevel.PACKED, 200, "u-2087"],
    ["C4", CrowdLevel.COMFORTABLE, 55, "u-5123"],
    ["C4", CrowdLevel.CROWDED, 130, "u-4590"],
    ["C4", CrowdLevel.COMFORTABLE, 20, "u-1042"],
    ["C5", CrowdLevel.COMFORTABLE, 45, "u-3311"],
    ["C5", CrowdLevel.EMPTY, 90, "u-5123"],
    ["C6", CrowdLevel.CROWDED, 1500, "u-2087"], // fully decayed -> No Recent Data
    ["C7", CrowdLevel.PACKED, 35, "u-4590"],
    // C8 intentionally left with zero reports -> "No Data"
  ];

  const trustOf = (id: string) =>
    MOCK_USERS.find((u) => u.id === id)?.trustScore ?? 1;

  const reports = plan.map(([coach, level, ago, user]) =>
    makeReport("90512", coach, level, ago, user, trustOf(user), now),
  );

  // A lighter set for the other trains so they are demonstrable too.
  const others: CrowdReport[] = [
    makeReport("90518", "C2", CrowdLevel.COMFORTABLE, 60, "u-1042", 1.22, now),
    makeReport("90518", "C3", CrowdLevel.COMFORTABLE, 25, "u-3311", 1.05, now),
    makeReport("90518", "C5", CrowdLevel.CROWDED, 80, "u-5123", 1.34, now),
    makeReport("90524", "C1", CrowdLevel.EMPTY, 50, "u-4590", 0.93, now),
    makeReport("90524", "C4", CrowdLevel.COMFORTABLE, 35, "u-2087", 0.78, now),
  ];

  return [...reports, ...others];
}
