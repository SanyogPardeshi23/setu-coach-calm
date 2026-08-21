import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, TrainFront } from "lucide-react";
import { STATIONS, TRAINS } from "@/data/mockData";
import { setuActions, useSetuStore } from "@/store/setuStore";
import { useTrainView } from "@/hooks/useTrainView";
import { formatPercent } from "@/engine/decayWeightedEngine";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CrowdBadge } from "@/components/CrowdBadge";
import { HonestyNote } from "@/components/HonestyNote";
import { colorForScore } from "@/lib/crowdUi";
import { scoreToLevel } from "@/engine/decayWeightedEngine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SETU — Know the crowd before you board" },
      {
        name: "description",
        content:
          "SETU shows coach-wise crowd levels for suburban trains and tells you whether to board now, wait, or move coach — with the reasoning.",
      },
      { property: "og:title", content: "SETU — Surge Evaluation & Transit Utility" },
      {
        property: "og:description",
        content:
          "Crowdsourced, time-decay weighted coach crowd levels with a rule-based board/wait/move recommendation.",
      },
    ],
  }),
  component: PassengerHome,
});

function PassengerHome() {
  const { selectedStationId } = useSetuStore();
  const { train, aggregates, avgOccupancy, recommendation, upcoming, now } =
    useTrainView();

  const color = colorForScore(avgOccupancy);
  const scoredCount = aggregates.filter((a) => a.status === "SCORED").length;

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Should you board this train?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crowd levels come from passenger reports, weighted by recency and
          reporter trust.
        </p>
      </section>

      <section className="card-surface p-4">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Station
        </label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {STATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setuActions.selectStation(s.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                s.id === selectedStationId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <MapPin className="size-3.5" />
              {s.name}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Train
        </label>
        <div className="mt-2 space-y-2">
          {TRAINS.map((t) => (
            <button
              key={t.id}
              onClick={() => setuActions.selectTrain(t.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                t.id === train.id
                  ? "border-primary bg-accent/60"
                  : "border-border bg-card hover:bg-secondary"
              }`}
            >
              <TrainFront className="size-5 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {t.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  #{t.id} · {t.line} · departs in {t.departureIn} min
                </span>
              </span>
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <section className="card-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live average occupancy
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className="text-4xl font-extrabold tabular-nums"
                style={{ color }}
              >
                {avgOccupancy === null ? "—" : formatPercent(avgOccupancy)}
              </span>
              <CrowdBadge
                level={avgOccupancy === null ? null : scoreToLevel(avgOccupancy)}
              />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Train #{train.id} · {scoredCount}/{train.coaches.length} coaches
              with live data
            </div>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${Math.round((avgOccupancy ?? 0) * 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </section>

      <RecommendationCard recommendation={recommendation} />

      <section className="card-surface p-5">
        <h2 className="text-sm font-bold tracking-tight">Upcoming trains</h2>
        <div className="mt-3 space-y-2">
          {upcoming.map((t) => (
            <div
              key={t.trainId}
              className="flex items-center justify-between rounded-xl border border-border px-3.5 py-3"
            >
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  #{t.trainId} · ETA {t.etaMinutes} min
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-lg font-bold tabular-nums"
                  style={{ color: colorForScore(t.predictedOccupancy) }}
                >
                  {formatPercent(t.predictedOccupancy)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  predicted (demo)
                </div>
              </div>
            </div>
          ))}
        </div>
        <HonestyNote className="mt-3">
          Predicted occupancy for upcoming trains is fixed demo data, not a
          machine-learning forecast and not live railway data.
        </HonestyNote>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/train"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
        >
          See coach-wise crowd
        </Link>
        <Link
          to="/report"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-4 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          Report crowd (+10 pts)
        </Link>
      </div>

      <HonestyNote>
        Updated {new Date(now).toLocaleTimeString()} · Prototype build with
        simulated data. No live railway feed, no passenger counting, no ML.
      </HonestyNote>
    </div>
  );
}
