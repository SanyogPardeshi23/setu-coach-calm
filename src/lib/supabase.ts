// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lwegdllfemsveabukjtq.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_Dl_eIBgwKwX3HIrfJlwKfA_49VZNYlb";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Best-effort persistence — never blocks or breaks the app if it fails.
 * The in-memory store remains the source of truth for the live demo;
 * this is an additive write for real database evidence.
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
    // Silently ignore — DB is additive evidence, not required for the app to work.
  }
}
