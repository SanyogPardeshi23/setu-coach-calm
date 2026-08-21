import { useMemo } from "react";
import {
  aggregateTrain,
  trainAverageOccupancy,
} from "@/engine/decayWeightedEngine";
import { recommend } from "@/engine/recommendationEngine";
import { TRAINS, UPCOMING_TRAINS } from "@/data/mockData";
import { useSetuStore } from "@/store/setuStore";
import { useLiveClock } from "@/hooks/useLiveClock";

export function useTrainView() {
  const { reports, selectedTrainId, selectedCoachId } = useSetuStore();
  const now = useLiveClock(1000);

  const train = TRAINS.find((t) => t.id === selectedTrainId) ?? TRAINS[0]!;
  const upcoming = UPCOMING_TRAINS[train.id] ?? [];

  const aggregates = useMemo(
    () => aggregateTrain(train.coaches, reports, train.id, now),
    [train, reports, now],
  );

  const avgOccupancy = useMemo(
    () => trainAverageOccupancy(aggregates),
    [aggregates],
  );

  const recommendation = useMemo(
    () => recommend(aggregates, upcoming, selectedCoachId),
    [aggregates, upcoming, selectedCoachId],
  );

  const bestCoachId = useMemo(() => {
    const scored = aggregates.filter((a) => a.status === "SCORED");
    if (scored.length === 0) return null;
    return [...scored].sort(
      (a, b) => (a.occupancyScore as number) - (b.occupancyScore as number),
    )[0]!.coachId;
  }, [aggregates]);

  return {
    now,
    train,
    upcoming,
    aggregates,
    avgOccupancy,
    recommendation,
    bestCoachId,
    selectedCoachId,
  };
}
