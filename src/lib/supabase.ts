// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { CrowdReport } from "@/engine/decayWeightedEngine";

const SUPABASE_URL = "https://lwegdllfemsveabukjtq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Dl_eIBgwKwX3HIrfJlwKfA_49VZNYlb";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Best-effort persistence — never blocks or breaks the app if it fails.
 * The in-memory store remains readable even if this write fails.
 */
export async function persistReportToDb(report: {
  id: string;
  trainId: string;
  coachId: string;
  level: number;
  timestamp: number;
  userId: string;
  userTrustScore: number;
  locationVerified?: boolean;
  distanceMeters?: number | null;
}) {
  try {
    await supabase.from("crowd_reports").insert({
      id: report.id,
      train_id: report.trainId,
      coach_id: report.coachId,
      level: report.level,
      timestamp: report.timestamp,
      user_id: report.userId,
      user_trust_score: report.userTrustScore,
      location_verified: report.locationVerified ?? null,
      distance_meters: report.distanceMeters ?? null,
    });
  } catch {
    // Silently ignore — a failed write must never break the app.
  }
}

/**
 * Fetches all reports for a train from the shared database — this is
 * the read path that makes the store genuinely multi-user, not just a
 * write-only audit log. Returns [] on any failure, never throws.
 */
export async function fetchReportsFromDb(
  trainId: string,
): Promise<CrowdReport[]> {
  try {
    const { data, error } = await supabase
      .from("crowd_reports")
      .select("*")
      .eq("train_id", trainId)
      .order("timestamp", { ascending: false })
      .limit(200);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      trainId: row.train_id,
      coachId: row.coach_id,
      level: row.level,
      timestamp: row.timestamp,
      userId: row.user_id,
      userTrustScore: row.user_trust_score,
      locationVerified: row.location_verified ?? undefined,
      distanceMeters: row.distance_meters ?? undefined,
    }));
  } catch {
    return [];
  }
}
