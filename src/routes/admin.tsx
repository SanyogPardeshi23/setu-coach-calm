import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CROWD_LEVEL_LABELS,
  CrowdLevel,
  formatPercent,
  relativeTime,
} from "@/engine/decayWeightedEngine";
import { MOCK_USERS, TRAINS } from "@/data/mockData";
import { setuActions, useSetuStore } from "@/store/setuStore";
import { useTrainView } from "@/hooks/useTrainView";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CrowdBadge } from "@/components/CrowdBadge";
import { HonestyNote } from "@/components/HonestyNote";
import { colorForScore } from "@/lib/crowdUi";
import { trustTier } from "@/engine/trustEngine";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard & demo simulation | SETU" },
      {
        name: "description",
        content:
          "Operator view of SETU: live coach aggregation, simulated trust verification events and a demo simulation that runs the real decay and recommendation formulas.",
      },
      { property: "og:title", content: "Admin dashboard | SETU" },
      {
        property: "og:description",
        content:
          "Watch the decay, trust and recommendation engines update the UI in real time.",
      },
    ],
  }),
  component: AdminDashboard,
});

const SIM_INTERVAL_MS = 2500;
const randomOf = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function AdminDashboard() {
  const { reports, trustScores, verifications, simulationRunning } =
    useSetuStore();
  const { train, aggregates, avgOccupancy, recommendation, now } =
    useTrainView();
  const [series, setSeries] = useState<{ t: string; value: number }[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!simulationRunning) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      return;
    }
    timer.current = setInterval(() => {
      const t = TRAINS[0]!;
      // 1. a few fresh crowd reports from simulated users
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const user = randomOf(MOCK_USERS.filter((u) => u.id !== "u-you"));
        setuActions.submitReport({
          trainId: t.id,
          coachId: randomOf(t.coaches),
          level: randomOf([
            CrowdLevel.EMPTY,
            CrowdLevel.COMFORTABLE,
            CrowdLevel.CROWDED,
            CrowdLevel.CROWDED,
            CrowdLevel.PACKED,
          ]),
          userId: user.id,
        });
      }
      // 2. simulated ground-truth verification events
      for (let i = 0; i < 2; i++) {
        const user = randomOf(MOCK_USERS);
        const reported = randomOf([0, 1, 2, 3]) as CrowdLevel;
        const drift = randomOf([0, 0, 1, -1]);
        const actual = Math.max(
          0,
          Math.min(3, reported + drift),
        ) as CrowdLevel;
        setuActions.runVerification(user.id, reported, actual);
      }
      setuActions.bumpTick();
    }, SIM_INTERVAL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [simulationRunning]);

  useEffect(() => {
    if (avgOccupancy === null) return;
    setSeries((prev) =>
      [
        ...prev,
        {
          t: new Date(now).toLocaleTimeString([], {
            minute: "2-digit",
            second: "2-digit",
          }),
          value: Math.round(avgOccupancy * 100),
        },
      ].slice(-40),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(now / 2000)]);

  const activeReports = reports.filter((r) => r.trainId === train.id);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Admin dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operator view · Train #{train.id} · all data simulated
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setuActions.setSimulationRunning(!simulationRunning)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {simulationRunning ? (
              <>
                <Pause className="size-4" /> Pause simulation
              </>
            ) : (
              <>
                <Play className="size-4" /> Run demo simulation
              </>
            )}
          </button>
          <button
            onClick={() => {
              setuActions.resetDemo();
              setSeries([]);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            <RotateCcw className="size-4" /> Reset
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Average occupancy"
          value={avgOccupancy === null ? "—" : formatPercent(avgOccupancy)}
          color={colorForScore(avgOccupancy)}
          icon={Activity}
        />
        <StatCard
          label="Reports on this train"
          value={String(activeReports.length)}
          icon={Users}
        />
        <StatCard
          label="Verification events"
          value={String(verifications.length)}
          icon={ShieldCheck}
        />
        <StatCard
          label="Simulation"
          value={simulationRunning ? "Running" : "Idle"}
          color={
            simulationRunning ? "var(--crowd-low)" : "var(--color-muted-foreground)"
          }
          icon={Play}
        />
      </div>

      <RecommendationCard recommendation={recommendation} />

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card-surface p-5 lg:col-span-2">
          <h2 className="text-sm font-bold tracking-tight">
            Live average occupancy (computed, not animated)
          </h2>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: -20 }}>
                <XAxis dataKey="t" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="text-sm font-bold tracking-tight">
            Reporter trust scores
          </h2>
          <ul className="mt-3 space-y-2">
            {MOCK_USERS.map((u) => {
              const score = trustScores[u.id] ?? 1;
              return (
                <li key={u.id} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{u.name}</span>
                    <span className="tabular-nums font-bold">
                      ×{score.toFixed(3)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${((score - 0.5) / 1) * 100}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {trustTier(score)} · bounded 0.50–1.50
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card-surface overflow-x-auto p-5">
        <h2 className="text-sm font-bold tracking-tight">Coach aggregation</h2>
        <table className="mt-3 w-full min-w-[640px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2">Coach</th>
              <th>Status</th>
              <th>Occupancy</th>
              <th>Level</th>
              <th>Reports</th>
              <th>Total weight</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {aggregates.map((a) => (
              <tr key={a.coachId}>
                <td className="py-2.5 font-semibold">{a.coachId}</td>
                <td className="text-xs text-muted-foreground">
                  {a.status === "SCORED"
                    ? "Live"
                    : a.status === "NO_RECENT_DATA"
                      ? "No recent data"
                      : "No data"}
                </td>
                <td
                  className="font-bold tabular-nums"
                  style={{ color: colorForScore(a.occupancyScore) }}
                >
                  {a.occupancyScore === null
                    ? "—"
                    : formatPercent(a.occupancyScore)}
                </td>
                <td>
                  <CrowdBadge level={a.level} size="sm" />
                </td>
                <td className="tabular-nums">{a.numReports}</td>
                <td className="tabular-nums">{a.totalWeight.toFixed(3)}</td>
                <td className="tabular-nums">
                  {Math.round(a.confidence * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card-surface p-5">
        <h2 className="text-sm font-bold tracking-tight">
          Simulated verification log
        </h2>
        {verifications.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No verification events yet — start the demo simulation.
          </p>
        ) : (
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto text-xs">
            {verifications.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-secondary/60 px-3 py-2"
              >
                <span className="font-semibold">{v.userId}</span>
                <span className="text-muted-foreground">
                  reported {CROWD_LEVEL_LABELS[v.reportedLevel]} · actual{" "}
                  {CROWD_LEVEL_LABELS[v.actualLevel]} · error{" "}
                  {v.error.toFixed(2)}
                </span>
                <span className="ml-auto tabular-nums font-semibold">
                  ×{v.previousScore.toFixed(3)} → ×{v.newScore.toFixed(3)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(v.timestamp, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HonestyNote>
        Simulated verification only — SETU has no live staff checkpoint feed, no
        camera counting and no ML model in this prototype. Every number above is
        produced by the decay, trust and recommendation formulas running on
        demo reports.
      </HonestyNote>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div
        className="mt-1.5 text-2xl font-extrabold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
