/**
 * SETU — Mock / demo data only.
 * Replace this file with real API calls later; the UI reads only from
 * the store + engines, never from a network client directly.
 */

import { CrowdLevel, type CrowdReport } from "@/engine/decayWeightedEngine";
import type { UpcomingTrain } from "@/engine/recommendationEngine";
import { haversineDistanceMeters } from "@/utils/geofence";

export interface Station {
  id: string;
  name: string;
  line: string;
  /** Approximate coordinates — demo data for the proximity check only. */
  lat: number;
  lng: number;
}

export interface Train {
  id: string;
  name: string;
  line: string;
  direction: string;
  departureIn: number; // minutes
  coaches: string[];
  type: "Fast" | "Slow";
  originId: string;
  destinationId: string;
  stops: string[]; // station ids, in route order
}

const LINE = "Central Line";

/** Full Central Line list, in geographic order (CSMT → Kalyan). */
export const STATIONS: Station[] = [
  { id: "CSMT", name: "CSMT", line: LINE, lat: 18.9401, lng: 72.8353 },
  { id: "BY", name: "Byculla", line: LINE, lat: 18.9760, lng: 72.8329 },
  { id: "CHG", name: "Chinchpokli", line: LINE, lat: 18.9843, lng: 72.8322 },
  { id: "CRD", name: "Currey Road", line: LINE, lat: 18.9932, lng: 72.8340 },
  { id: "PL", name: "Parel", line: LINE, lat: 19.0043, lng: 72.8375 },
  { id: "DR", name: "Dadar", line: LINE, lat: 19.0186, lng: 72.8435 },
  { id: "MTN", name: "Matunga", line: LINE, lat: 19.0270, lng: 72.8520 },
  { id: "SIN", name: "Sion", line: LINE, lat: 19.0437, lng: 72.8615 },
  { id: "CLA", name: "Kurla", line: LINE, lat: 19.0653, lng: 72.8792 },
  { id: "VVH", name: "Vidyavihar", line: LINE, lat: 19.0800, lng: 72.8968 },
  { id: "GC", name: "Ghatkopar", line: LINE, lat: 19.0860, lng: 72.9081 },
  { id: "VK", name: "Vikhroli", line: LINE, lat: 19.1109, lng: 72.9285 },
  { id: "KJMG", name: "Kanjurmarg", line: LINE, lat: 19.1300, lng: 72.9360 },
  { id: "BND", name: "Bhandup", line: LINE, lat: 19.1440, lng: 72.9370 },
  { id: "NHU", name: "Nahur", line: LINE, lat: 19.1560, lng: 72.9440 },
  { id: "MLND", name: "Mulund", line: LINE, lat: 19.1723, lng: 72.9567 },
  { id: "TNA", name: "Thane", line: LINE, lat: 19.1860, lng: 72.9754 },
  { id: "KLVA", name: "Kalwa", line: LINE, lat: 19.1930, lng: 73.0000 },
  { id: "MBQ", name: "Mumbra", line: LINE, lat: 19.1890, lng: 73.0230 },
  { id: "DIVA", name: "Diva", line: LINE, lat: 19.1900, lng: 73.0400 },
  { id: "KOPR", name: "Kopar", line: LINE, lat: 19.2050, lng: 73.0620 },
  { id: "DI", name: "Dombivli", line: LINE, lat: 19.2158, lng: 73.0868 },
  { id: "TLA", name: "Thakurli", line: LINE, lat: 19.2280, lng: 73.1000 },
  { id: "KYN", name: "Kalyan", line: LINE, lat: 19.2437, lng: 73.1300 },
];

/** Stations a Fast train actually halts at. */
export const FAST_STOP_IDS = [
  "CSMT",
  "BY",
  "DR",
  "CLA",
  "GC",
  "TNA",
  "DI",
  "KYN",
];

/** Slow trains halt everywhere. */
export const SLOW_STOP_IDS = STATIONS.map((s) => s.id);

export function stationName(id: string): string {
  return STATIONS.find((s) => s.id === id)?.name ?? id;
}

export function stationIndex(id: string): number {
  return STATIONS.findIndex((s) => s.id === id);
}

export function stationById(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

/** Stops for a train type, trimmed to the origin → destination segment. */
function routeStops(
  type: "Fast" | "Slow",
  originId: string,
  destinationId: string,
): string[] {
  const base = type === "Fast" ? FAST_STOP_IDS : SLOW_STOP_IDS;
  const from = base.indexOf(originId);
  const to = base.indexOf(destinationId);
  return from <= to ? base.slice(from, to + 1) : base.slice(to, from + 1).reverse();
}

/** Standard 12-car suburban rake. */
export const COACHES = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
  "C10",
  "C11",
  "C12",
];

export type CoachClass = "FIRST" | "SECOND";

export interface CoachMeta {
  coachId: string;
  /** Position in the rake, 1 = engine end. */
  position: number;
  coachClass: CoachClass;
  /** Illustrative platform indicator-pole reference. */
  platformPosition: string;
}

/**
 * DEMO model of a standard 12-car Mumbai suburban EMU:
 * coach 1 and coach 12 are First Class, the rest Second Class.
 * Real rakes vary — this is illustrative only.
 */
const POLE_LABELS: string[] = [
  "Pole A1 — Front of platform (engine end)",
  "Pole A2",
  "Pole A3",
  "Pole B1",
  "Pole B2",
  "Pole B3",
  "Pole C1",
  "Pole C2",
  "Pole C3",
  "Pole D1",
  "Pole D2",
  "Pole D3 — Rear of platform (guard end)",
];

export const COACH_META: Record<string, CoachMeta> = Object.fromEntries(
  COACHES.map((coachId, i) => [
    coachId,
    {
      coachId,
      position: i + 1,
      coachClass: (i === 0 || i === COACHES.length - 1
        ? "FIRST"
        : "SECOND") as CoachClass,
      platformPosition: POLE_LABELS[i] ?? `Pole ${i + 1}`,
    },
  ]),
);

export function coachClassOf(coachId: string): CoachClass {
  return COACH_META[coachId]?.coachClass ?? "SECOND";
}

/**
 * Fixed total-seat estimates per coach class, standard Mumbai suburban
 * rake. Second Class: ~96-100 seats (3-per-bench, often 4 in rush hour).
 * First Class: ~80-84 seats. Midpoints used as a single fixed figure.
 */
export const SEATS_PER_CLASS: Record<CoachClass, number> = {
  FIRST: 82,
  SECOND: 98,
};

export function totalSeatsOf(coachId: string): number {
  return SEATS_PER_CLASS[coachClassOf(coachId)];
}

export function platformPositionOf(coachId: string): string {
  return COACH_META[coachId]?.platformPosition ?? "Position unknown";
}

export const COACH_CLASS_LABELS: Record<CoachClass, string> = {
  FIRST: "1st Class",
  SECOND: "2nd Class",
};

export const COACH_CLASS_DISCLAIMER =
  "Demo model — real coach class positions vary by rake.";

export const POLE_DISCLAIMER =
  "Pole positions are illustrative — actual platform markings vary by station and rake length.";

export const TRAINS: Train[] = [
  {
    id: "90512",
    name: "CSMT — Thane Fast",
    line: LINE,
    direction: "Northbound",
    departureIn: 2,
    coaches: COACHES,
    type: "Fast",
    originId: "CSMT",
    destinationId: "TNA",
    stops: routeStops("Fast", "CSMT", "TNA"),
  },
  {
    id: "90518",
    name: "CSMT — Kalyan Slow",
    line: LINE,
    direction: "Northbound",
    departureIn: 5,
    coaches: COACHES,
    type: "Slow",
    originId: "CSMT",
    destinationId: "KYN",
    stops: routeStops("Slow", "CSMT", "KYN"),
  },
  {
    id: "90524",
    name: "CSMT — Dombivli Fast",
    line: LINE,
    direction: "Northbound",
    departureIn: 9,
    coaches: COACHES,
    type: "Fast",
    originId: "CSMT",
    destinationId: "DI",
    stops: routeStops("Fast", "CSMT", "DI"),
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

export function nearestStation(lat: number, lng: number): { station: Station; distanceMeters: number } {
  let best: Station = STATIONS[0]!;
  let bestDist = Infinity;
  for (const s of STATIONS) {
    const d = haversineDistanceMeters({ lat, lng }, { lat: s.lat, lng: s.lng });
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return { station: best, distanceMeters: bestDist };
}

/** Upcoming trains with mock predicted occupancy (NOT an ML prediction). */
export const UPCOMING_TRAINS: Record<string, UpcomingTrain[]> = {
  "90512": [
    {
      trainId: "90518",
      name: "CSMT — Kalyan Slow",
      etaMinutes: 5,
      predictedOccupancy: 0.52,
    },
    {
      trainId: "90524",
      name: "CSMT — Dombivli Fast",
      etaMinutes: 9,
      predictedOccupancy: 0.41,
    },
  ],
  "90518": [
    {
      trainId: "90524",
      name: "CSMT — Dombivli Fast",
      etaMinutes: 4,
      predictedOccupancy: 0.44,
    },
  ],
  "90524": [
    {
      trainId: "90512",
      name: "CSMT — Thane Fast",
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
    locationVerified: true,
  };
}

/**
 * Seeded reports, generated relative to "now" so the demo always shows
 * a mix of fresh, decaying and fully stale data.
 */
export function seedReports(now: number = Date.now()): CrowdReport[] {
  const plan: Array<[string, CrowdLevel, number, string]> = [
    // coach, level, secondsAgo, userId
    ["C1", CrowdLevel.CROWDED, 25, "u-1042"], // First Class
    ["C1", CrowdLevel.COMFORTABLE, 70, "u-2087"],
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
    ["C8", CrowdLevel.CROWDED, 60, "u-3311"],
    ["C9", CrowdLevel.PACKED, 50, "u-1042"],
    ["C10", CrowdLevel.CROWDED, 75, "u-5123"],
    ["C12", CrowdLevel.EMPTY, 40, "u-4590"], // First Class, roomy
    ["C12", CrowdLevel.COMFORTABLE, 105, "u-3311"],
    // C11 intentionally left with zero reports -> "No Data"
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
    makeReport("90518", "C12", CrowdLevel.EMPTY, 45, "u-4590", 0.93, now),
    makeReport("90524", "C1", CrowdLevel.EMPTY, 50, "u-4590", 0.93, now),
    makeReport("90524", "C4", CrowdLevel.COMFORTABLE, 35, "u-2087", 0.78, now),
    makeReport("90524", "C9", CrowdLevel.CROWDED, 70, "u-5123", 1.34, now),
  ];

  return [...reports, ...others];
}
