/**
 * SETU — in-memory app store (frontend only).
 * A future backend service can replace the mutators with API calls.
 */
import { persistReportToDb } from "@/lib/supabase";
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
