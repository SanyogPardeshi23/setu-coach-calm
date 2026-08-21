import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercent, scoreToLevel } from "@/engine/decayWeightedEngine";
import { useTrainView } from "@/hooks/useTrainView";
import { setuActions } from "@/store/setuStore";
import { CoachCard } from "@/components/CoachCard";
import { CrowdBadge } from "@/components/CrowdBadge";
import { RecommendationCard } from "@/components/RecommendationCard";
import { HonestyNote } from "@/components/HonestyNote";
import { colorForScore } from "@/lib/crowdUi";

export const Route = createFileRoute("/train")({
  head: () => ({
    meta: [
      { title: "Coach-wise crowd details | SETU" },
      {
        name: "description",
        content:
          "Live coach-by-coach occupancy for your selected suburban train, aggregated with a 3-minute half-life decay and reporter trust weighting.",
      },
      { property: "og:title", content: "Coach-wise crowd details | SETU" },
      {
        property: "og:description",
        content:
          "See which coach has space before the train arrives — with confidence levels and honest empty states.",
      },
    ],
  }),
  component: TrainDetails,
});

function TrainDetails() {
  const {
    train,
    aggregates,
    avgOccupancy,
    recommendation,
    bestCoachId,
    selectedCoachId,
    now,
  } = useTrainView();

  const chartData = aggregates.map((a) => ({
    coach: a.coachId,
    value: a.occupancyScore === null ? 0 : Math.round(a.occupancyScore * 100),
    status: a.status,
  }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {train.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            #{train.id} · {train.line} · {train.direction} · departs in{" "}
            {train.departureIn} min
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-3xl font-extrabold tabular-nums"
            style={{ color: colorForScore(avgOccupancy) }}
          >
            {avgOccupancy === null ? "—" : formatPercent(avgOccupancy)}
          </span>
          <CrowdBadge
            level={avgOccupancy === null ? null : scoreToLevel(avgOccupancy)}
          />
        </div>
      </header>

      <RecommendationCard recommendation={recommendation} />

      <section className="card-surface p-5">
        <h2 className="text-sm font-bold tracking-tight">
          Coach-wise occupancy
        </h2>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="coach"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                unit="%"
              />
              <Tooltip
                cursor={{ fill: "var(--color-secondary)" }}
                formatter={(v: number, _n, item) =>
                  item.payload.status === "SCORED"
                    ? [`${v}%`, "Occupancy"]
                    : [
                        item.payload.status === "NO_DATA"
                          ? "No data"
                          : "No recent data",
                        "Occupancy",
                      ]
                }
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.coach}
                    fill={
                      d.status === "SCORED"
                        ? colorForScore(d.value / 100)
                        : "var(--crowd-none)"
                    }
                    opacity={d.status === "SCORED" ? 1 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <HonestyNote className="mt-2">
          Scores are computed live with weight = e^(-ln2/180 · seconds) ×
          reporter trust. Grey bars mean there is no usable report, not an empty
          coach.
        </HonestyNote>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight">
            Select your coach
          </h2>
          <span className="text-xs text-muted-foreground">
            Your coach: {selectedCoachId}
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aggregates.map((a) => (
            <CoachCard
              key={a.coachId}
              aggregate={a}
              now={now}
              selected={a.coachId === selectedCoachId}
              best={a.coachId === bestCoachId}
              onSelect={setuActions.selectCoach}
            />
          ))}
        </div>
      </section>

      <Link
        to="/report"
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.99]"
      >
        Report crowd for coach {selectedCoachId}
      </Link>
    </div>
  );
}
