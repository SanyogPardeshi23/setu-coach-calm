import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  CROWD_LEVEL_DESCRIPTIONS,
  CROWD_LEVEL_LABELS,
  CrowdLevel,
  locationWeight,
  scoreToLevel,
} from "@/engine/decayWeightedEngine";
import { crowdColorVar } from "@/lib/crowdUi";
import {
  TRAINS,
  CURRENT_USER_ID,
  coachClassOf,
  nearestStation,
  COACH_CLASS_DISCLAIMER,
} from "@/data/mockData";
import { setuActions, useSetuStore, POINTS_PER_REPORT } from "@/store/setuStore";
import { HonestyNote } from "@/components/HonestyNote";
import { trustTier } from "@/engine/trustEngine";
import {
  getCurrentPosition,
  GEOFENCE_RADIUS_METERS,
  formatDistance,
} from "@/utils/geofence";
import { enqueueReport, isOnline } from "@/utils/offlineQueue";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report crowd | SETU" },
      {
        name: "description",
        content:
          "Report how crowded your coach is — by tapping a level or entering an empty-seat count.",
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

/**
 * Fixed total-seat estimates per coach class, standard Mumbai suburban
 * rake. Second Class: ~96-100 seats (3-per-bench, often 4 in rush hour).
 * First Class: ~80-84 seats (fewer, more individual room). Midpoints used
 * as a single fixed figure for this demo, not measured per-coach.
 */
const SEATS_PER_CLASS: Record<"FIRST" | "SECOND", number> = {
  SECOND: 98,
  FIRST: 82,
};

function ReportCrowd() {
  const { selectedTrainId, selectedCoachId, trustScores } = useSetuStore();
  const navigate = useNavigate();
  const [level, setLevel] = useState<CrowdLevel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emptySeats, setEmptySeats] = useState<string>("");

  const train = TRAINS.find((t) => t.id === selectedTrainId) ?? TRAINS[0]!;
  const trust = trustScores[CURRENT_USER_ID] ?? 1;
  const selectedClass = coachClassOf(selectedCoachId);
  const totalSeats = SEATS_PER_CLASS[selectedClass];

  function handleApplySeatCount() {
    const empty = Number(emptySeats);
    if (emptySeats === "" || empty < 0 || empty > totalSeats) {
      toast.error(`Enter a number between 0 and ${totalSeats}.`);
      return;
    }
    const occupiedRatio = (totalSeats - empty) / totalSeats;
    const derivedLevel = scoreToLevel(occupiedRatio);
    setLevel(derivedLevel);
    toast(`Level set to ${CROWD_LEVEL_LABELS[derivedLevel]}`, {
      description: `${empty}/${totalSeats} seats empty · ${selectedClass === "FIRST" ? "1st" : "2nd"} Class`,
    });
  }

  function finalize(locationVerified: boolean, distanceMeters: number | null) {
    if (level === null) return;

    const reportPayload = {
      trainId: train.id,
      coachId: selectedCoachId,
      level,
      locationVerified,
      distanceMeters,
    };

    if (!isOnline()) {
      enqueueReport({
        id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...reportPayload,
        timestamp: Date.now(),
        userId: CURRENT_USER_ID,
        userTrustScore: trust,
        queued: true,
      });
      toast("Queued — will send when back online", {
        description: `Coach ${selectedCoachId} · ${CROWD_LEVEL_LABELS[level]}`,
      });
    } else {
      setuActions.submitReport(reportPayload);

      const isFarAway =
        distanceMeters !== null && distanceMeters > GEOFENCE_RADIUS_METERS;

      if (isFarAway) {
        const pct = Math.round(locationWeight(distanceMeters) * 100);
        toast.success(`Report submitted · ${pct}% location confidence`, {
          description: `About ${formatDistance(distanceMeters!)} from the nearest station — reports farther away carry proportionally less weight.`,
        });
      } else {
        toast.success(`Report submitted · +${POINTS_PER_REPORT} SETU Points`, {
          description: `Coach ${selectedCoachId} · ${CROWD_LEVEL_LABELS[level]} · weight ×${trust.toFixed(2)} trust`,
        });
      }
    }

    setLevel(null);
    setEmptySeats("");
    navigate({ to: "/train" });
  }

  async function submit() {
    if (level === null) return;
    setSubmitting(true);

    try {
      let locationVerified = false;
      let distanceMeters: number | null = null;

      try {
        const pos = await getCurrentPosition();
        const { distanceMeters: d } = nearestStation(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        distanceMeters = d;
        locationVerified = d <= GEOFENCE_RADIUS_METERS;
      } catch {
        locationVerified = false;
        distanceMeters = null;
      }

      finalize(locationVerified, distanceMeters);
    } finally {
      setSubmitting(false);
    }
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
          {train.coaches.map((c) => {
            const isFirst = coachClassOf(c) === "FIRST";
            const active = c === selectedCoachId;
            return (
              <button
                key={c}
                onClick={() => setuActions.selectCoach(c)}
                className={`relative rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : isFirst
                      ? "border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/20"
                      : "border-border hover:bg-secondary"
                }`}
              >
                {c}
                {isFirst && (
                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                    1st
                  </span>
                )}
              </button>
            );
          })}
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

      <section className="card-surface p-4 space-y-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Or enter empty seat count
        </label>
        <p className="text-xs text-muted-foreground">
          Coach {selectedCoachId} is {selectedClass === "FIRST" ? "1st" : "2nd"}{" "}
          Class — assumed {totalSeats} total seats.
        </p>
        <div>
          <label className="text-xs text-muted-foreground">
            Empty seats (0–{totalSeats})
          </label>
          <input
            type="number"
            min={0}
            max={totalSeats}
            value={emptySeats}
            onChange={(e) => setEmptySeats(e.target.value)}
            placeholder="e.g. 12"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleApplySeatCount}
          className="w-full rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"
        >
          Apply seat count
        </button>
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
        disabled={level === null || submitting}
        className="w-full rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-40"
      >
        {submitting ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Checking location…
          </span>
        ) : (
          `Submit report (+${POINTS_PER_REPORT} SETU Points)`
        )}
      </button>

      <HonestyNote>
        Reports are stored in this prototype's memory only. Trust scores come
        from simulated verification, not live staff checkpoints. Seat totals
        are fixed per-class estimates, not measured per coach. Reports
        farther from a station carry proportionally less weight — this is a
        demo model, not a production anti-spoofing system.
        {" "}{COACH_CLASS_DISCLAIMER}
      </HonestyNote>
    </div>
  );
}
