import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  CROWD_LEVEL_DESCRIPTIONS,
  CROWD_LEVEL_LABELS,
  CrowdLevel,
} from "@/engine/decayWeightedEngine";
import { crowdColorVar } from "@/lib/crowdUi";
import { TRAINS, CURRENT_USER_ID } from "@/data/mockData";
import { setuActions, useSetuStore, POINTS_PER_REPORT } from "@/store/setuStore";
import { HonestyNote } from "@/components/HonestyNote";
import { trustTier } from "@/engine/trustEngine";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report crowd | SETU" },
      {
        name: "description",
        content:
          "Report how crowded your coach is in two taps. Your report is weighted by recency and your trust score, and earns 10 SETU points.",
      },
      { property: "og:title", content: "Report crowd | SETU" },
      {
        property: "og:description",
        content:
          "Crowdsourced, train-agnostic crowd reporting — no ticket required.",
      },
    ],
  }),
  component: ReportCrowd,
});

const LEVELS = [
  CrowdLevel.EMPTY,
  CrowdLevel.COMFORTABLE,
  CrowdLevel.CROWDED,
  CrowdLevel.PACKED,
];

function ReportCrowd() {
  const { selectedTrainId, selectedCoachId, trustScores } = useSetuStore();
  const navigate = useNavigate();
  const [level, setLevel] = useState<CrowdLevel | null>(null);

  const train = TRAINS.find((t) => t.id === selectedTrainId) ?? TRAINS[0]!;
  const trust = trustScores[CURRENT_USER_ID] ?? 1;

  function submit() {
    if (level === null) return;
    setuActions.submitReport({
      trainId: train.id,
      coachId: selectedCoachId,
      level,
    });
    toast.success(`Report submitted · +${POINTS_PER_REPORT} SETU Points`, {
      description: `Coach ${selectedCoachId} · ${CROWD_LEVEL_LABELS[level]} · weight ×${trust.toFixed(2)} trust`,
    });
    setLevel(null);
    navigate({ to: "/train" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Report crowd</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anyone can report — no ticket or booking needed.
        </p>
      </header>

      <section className="card-surface p-4">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Train
        </label>
        <div className="mt-2 grid gap-2">
          {TRAINS.map((t) => (
            <button
              key={t.id}
              onClick={() => setuActions.selectTrain(t.id)}
              className={`rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                t.id === train.id
                  ? "border-primary bg-accent/60 font-semibold"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {t.name}{" "}
              <span className="text-xs text-muted-foreground">#{t.id}</span>
            </button>
          ))}
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Coach
        </label>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {train.coaches.map((c) => (
            <button
              key={c}
              onClick={() => setuActions.selectCoach(c)}
              className={`rounded-xl border py-3 text-sm font-semibold transition-colors ${
                c === selectedCoachId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="card-surface p-4">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          How crowded is it right now?
        </label>
        <div className="mt-3 grid gap-2.5">
          {LEVELS.map((l) => {
            const color = crowdColorVar[l];
            const active = level === l;
            return (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className="flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all active:scale-[0.99]"
                style={{
                  borderColor: active ? color : "var(--color-border)",
                  backgroundColor: active
                    ? `color-mix(in oklch, ${color} 12%, transparent)`
                    : "transparent",
                }}
              >
                <span
                  className="size-3.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>
                  <span className="block text-sm font-bold">
                    {CROWD_LEVEL_LABELS[l]}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {CROWD_LEVEL_DESCRIPTIONS[l]} · level {l}
                  </span>
                </span>
                {active && (
                  <Check className="ml-auto size-5" style={{ color }} />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card-surface flex items-center justify-between p-4 text-sm">
        <span className="text-muted-foreground">
          Your trust score (simulated)
        </span>
        <span className="font-bold tabular-nums">
          ×{trust.toFixed(2)}{" "}
          <span className="text-xs font-medium text-muted-foreground">
            {trustTier(trust)}
          </span>
        </span>
      </section>

      <button
        onClick={submit}
        disabled={level === null}
        className="w-full rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-40"
      >
        Submit report (+{POINTS_PER_REPORT} SETU Points)
      </button>

      <HonestyNote>
        Reports are stored in this prototype's memory only. Trust scores come
        from simulated verification, not live staff checkpoints.
      </HonestyNote>
    </div>
  );
}
