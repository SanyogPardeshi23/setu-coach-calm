import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Inbox } from "lucide-react";
import {
  CROWD_LEVEL_LABELS,
  relativeTime,
  reportWeight,
} from "@/engine/decayWeightedEngine";
import { CURRENT_USER_ID } from "@/data/mockData";
import { useSetuStore } from "@/store/setuStore";
import { useLiveClock } from "@/hooks/useLiveClock";
import { CrowdBadge } from "@/components/CrowdBadge";
import { HonestyNote } from "@/components/HonestyNote";
import { trustTier } from "@/engine/trustEngine";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Your report history | SETU" },
      {
        name: "description",
        content:
          "Every crowd report you submitted, its live decayed weight, your trust score and your SETU points total.",
      },
      { property: "og:title", content: "Your report history | SETU" },
      {
        property: "og:description",
        content:
          "Watch your reports lose influence over time with a 3-minute half-life.",
      },
    ],
  }),
  component: ReportHistory,
});

function ReportHistory() {
  const { reports, points, trustScores, verifications } = useSetuStore();
  const now = useLiveClock(1000);

  const mine = reports
    .filter((r) => r.userId === CURRENT_USER_ID)
    .sort((a, b) => b.timestamp - a.timestamp);
  const trust = trustScores[CURRENT_USER_ID] ?? 1;
  const myVerifications = verifications.filter(
    (v) => v.userId === CURRENT_USER_ID,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Report history
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your contributions and how much they currently count.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-surface p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            SETU Points
          </div>
          <div className="mt-1 flex items-center gap-2 text-3xl font-extrabold tabular-nums text-primary">
            <Award className="size-6" /> {points}
          </div>
        </div>
        <div className="card-surface p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Reports submitted
          </div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums">
            {mine.length}
          </div>
        </div>
        <div className="card-surface p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trust score (simulated)
          </div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums">
            ×{trust.toFixed(2)}
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {trustTier(trust)}
            </span>
          </div>
        </div>
      </div>

      <section className="card-surface p-5">
        <h2 className="text-sm font-bold tracking-tight">Your reports</h2>
        {mine.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-secondary/60 px-4 py-10 text-center">
            <Inbox className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">No reports yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Submit your first crowd report to earn 10 SETU Points and help
              other commuters pick a coach.
            </p>
            <Link
              to="/report"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Report crowd
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {mine.map((r) => {
              const w = reportWeight(r, now);
              return (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      Train #{r.trainId} · Coach {r.coachId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {relativeTime(r.timestamp, now)} ·{" "}
                      {CROWD_LEVEL_LABELS[r.level]} · trust ×
                      {r.userTrustScore.toFixed(2)}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <CrowdBadge level={r.level} size="sm" />
                    <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">
                      weight {w.toFixed(3)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card-surface p-5">
        <h2 className="text-sm font-bold tracking-tight">
          Simulated verifications of your reports
        </h2>
        {myVerifications.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            None yet — run the Demo Simulation in the Admin Dashboard to
            generate simulated verification events.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-xs">
            {myVerifications.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2"
              >
                <span>
                  reported {CROWD_LEVEL_LABELS[v.reportedLevel]} · actual{" "}
                  {CROWD_LEVEL_LABELS[v.actualLevel]}
                </span>
                <span className="tabular-nums font-semibold">
                  ×{v.previousScore.toFixed(3)} → ×{v.newScore.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HonestyNote>
        Points are a flat +10 per report demo mechanic. Weights update live
        using the 180-second half-life decay formula.
      </HonestyNote>
    </div>
  );
}
