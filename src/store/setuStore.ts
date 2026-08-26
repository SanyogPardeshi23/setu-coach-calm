/**
 * SETU — in-memory app store (frontend only), backed by a shared
 * Supabase table for cross-device/cross-user reports.
 */
import { useSyncExternalStore } from "react";
import {
  CrowdLevel,
  type CrowdReport,
} from "@/engine/decayWeightedEngine";
import {
  applyVerification,
  DEFAULT_TRUST_SCORE,
  type VerificationEvent,
} from "@/engine/trustEngine";
import {
  CURRENT_USER_ID,
  MOCK_USERS,
  seedReports,
  TRAINS,
  STATIONS,
} from "@/data/mockData";
import { persistReportToDb, fetchReportsFromDb } from "@/lib/supabase";

export const POINTS_PER_REPORT = 10;

export interface SetuState {
  reports: CrowdReport[];
  trustScores: Record<string, number>;
  verifications: VerificationEvent[];
  points: number;
  selectedStationId: string;
  selectedTrainId: string;
  selectedCoachId: string;
  simulationRunning: boolean;
  tick: number;
}

const initialTrust: Record<string, number> = Object.fromEntries(
  MOCK_USERS.map((u) => [u.id, u.trustScore]),
);

let state: SetuState = {
  reports: seedReports(Date.now()),
  trustScores: initialTrust,
  verifications: [],
  points: 0,
  selectedStationId: STATIONS[0]!.id,
  selectedTrainId: TRAINS[0]!.id,
  selectedCoachId: "C3",
  simulationRunning: false,
  tick: 0,
};

const listeners = new Set<() => void>();

function setState(patch: Partial<SetuState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useSetuStore(): SetuState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Merges remote reports into the local list by id. Seeded demo reports
 * use "seed-..." ids and real reports use "rep-..." ids, so they never
 * collide — this only ever adds/refreshes real shared data.
 */
function mergeReports(
  local: CrowdReport[],
  remote: CrowdReport[],
): CrowdReport[] {
  const byId = new Map(local.map((r) => [r.id, r]));
  remote.forEach((r) => byId.set(r.id, r));
  return Array.from(byId.values());
}

export const setuActions = {
  getState: () => state,

  selectStation(id: string) {
    setState({ selectedStationId: id });
  },
  selectTrain(id: string) {
    setState({ selectedTrainId: id });
  },
  selectCoach(id: string) {
    setState({ selectedCoachId: id });
  },

  trustOf(userId: string) {
    return state.trustScores[userId] ?? DEFAULT_TRUST_SCORE;
  },

  submitReport(input: {
    trainId: string;
    coachId: string;
    level: CrowdLevel;
    userId?: string;
    locationVerified?: boolean;
    distanceMeters?: number | null;
    queued?: boolean;
  }) {
    const userId = input.userId ?? CURRENT_USER_ID;
    const report: CrowdReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      trainId: input.trainId,
      coachId: input.coachId,
      level: input.level,
      timestamp: Date.now(),
      userId,
      userTrustScore: state.trustScores[userId] ?? DEFAULT_TRUST_SCORE,
      locationVerified: input.locationVerified ?? true,
      distanceMeters: input.distanceMeters ?? null,
      queued: input.queued ?? false,
    };
    setState({
      reports: [...state.reports, report],
      points:
        userId === CURRENT_USER_ID
          ? state.points + POINTS_PER_REPORT
          : state.points,
    });
    persistReportToDb(report);
    return report;
  },

  ingestQueuedReport(report: CrowdReport) {
    setState({
      reports: [...state.reports, { ...report, queued: false }],
      points:
        report.userId === CURRENT_USER_ID
          ? state.points + POINTS_PER_REPORT
          : state.points,
    });
    persistReportToDb(report);
  },

  runVerification(userId: string, reported: CrowdLevel, actual: CrowdLevel) {
    const current = state.trustScores[userId] ?? DEFAULT_TRUST_SCORE;
    const event = applyVerification(current, userId, reported, actual);
    setState({
      trustScores: { ...state.trustScores, [userId]: event.newScore },
      verifications: [event, ...state.verifications].slice(0, 40),
    });
    return event;
  },

  setSimulationRunning(running: boolean) {
    setState({ simulationRunning: running });
  },

  bumpTick() {
    setState({ tick: state.tick + 1 });
  },

  resetDemo() {
    setState({
      reports: seedReports(Date.now()),
      trustScores: { ...initialTrust },
      verifications: [],
      points: 0,
      simulationRunning: false,
      tick: state.tick + 1,
    });
  },
};

/**
 * Polls the shared Supabase table every `intervalMs` and merges in any
 * reports other users/devices have submitted for the currently selected
 * train. Call once at app startup; returns a cleanup function.
 */
export function startRemoteSync(intervalMs = 5000): () => void {
  let stopped = false;

  async function tick() {
    if (stopped) return;
    const remote = await fetchReportsFromDb(state.selectedTrainId);
    if (remote.length > 0) {
      setState({ reports: mergeReports(state.reports, remote) });
    }
  }

  tick();
  const id = setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    clearInterval(id);
  };
}
