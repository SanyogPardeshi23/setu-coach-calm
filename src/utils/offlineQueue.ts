/**
 * SETU — offline report queue with background sync.
 *
 * When the browser is offline, reports are persisted to localStorage and
 * flushed automatically once connectivity returns. Kept deliberately
 * independent of the store and engines.
 */

import type { CrowdReport } from "@/engine/decayWeightedEngine";

const STORAGE_KEY = "setu.offline.reports.v1";

export type QueuedReport = CrowdReport;

type Listener = (queue: QueuedReport[]) => void;

const listeners = new Set<Listener>();
let flusher: ((reports: QueuedReport[]) => void) | null = null;
let wired = false;

function canStore(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export function readQueue(): QueuedReport[] {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedReport[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedReport[]) {
  if (canStore()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch {
      /* storage full / unavailable — queue is best-effort */
    }
  }
  listeners.forEach((l) => l(queue));
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function enqueueReport(report: QueuedReport): QueuedReport[] {
  const safe: QueuedReport = {
    ...report,
    timestamp: Number.isFinite(report.timestamp) ? report.timestamp : Date.now(),
    userTrustScore: Number.isFinite(report.userTrustScore)
      ? report.userTrustScore
      : 1,
  };
  const queue = [...readQueue(), { ...safe, queued: true }];
  writeQueue(queue);
  return queue;
}

export function clearQueue() {
  writeQueue([]);
}

/**
 * Register the function that actually commits a batch of reports (in this
 * prototype: the in-memory store; in production: the API client).
 */
export function setQueueFlusher(fn: (reports: QueuedReport[]) => void) {
  flusher = fn;
}

/** Returns how many reports were synced. */
export function flushQueue(): number {
  const queue = readQueue();
  if (queue.length === 0 || !flusher) return 0;
  flusher(queue.map((r) => ({ ...r, queued: false })));
  clearQueue();
  return queue.length;
}

/**
 * Wire up 'online'/'offline' listeners once. onSync fires with the number of
 * reports flushed when connectivity returns.
 */
export function initOfflineSync(onSync: (count: number) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => {
    const count = flushQueue();
    if (count > 0) onSync(count);
  };

  if (!wired) wired = true;
  window.addEventListener("online", handleOnline);

  // Catch the case where we came back online before listeners were attached.
  if (isOnline()) handleOnline();

  return () => window.removeEventListener("online", handleOnline);
}
