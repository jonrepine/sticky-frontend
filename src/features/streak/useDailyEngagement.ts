import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { DAILY_ENGAGEMENT } from "./graphql";
import type { DailyEngagementPoint } from "../../types";

const DEFAULT_WINDOW_DAYS = 365;

interface DailyEngagementQueryData {
  dailyEngagement: DailyEngagementPoint[];
}

export function useDailyEngagement(windowDays = DEFAULT_WINDOW_DAYS) {
  const { data, loading, error, refetch } = useQuery<DailyEngagementQueryData>(DAILY_ENGAGEMENT, {
    variables: { windowDays },
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });

  const points = useMemo<DailyEngagementPoint[]>(
    () =>
      (data?.dailyEngagement ?? []).map((point) => ({
        date: point.date,
        addedCount: Number(point.addedCount) || 0,
        learnedCount: Number(point.learnedCount) || 0,
        reviewedCount: Number(point.reviewedCount) || 0,
        totalCount: Number(point.totalCount) || 0,
      })),
    [data?.dailyEngagement]
  );

  return {
    points,
    loading,
    error,
    refetch,
  };
}
