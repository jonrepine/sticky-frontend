import { useQuery } from "@apollo/client";
import { DASHBOARD_QUERY } from "./graphql";
import type { DashboardData } from "../../types";

export function useDashboard() {
  const { data, loading, error, refetch } = useQuery<{
    dashboardInfoBits: DashboardData;
  }>(DASHBOARD_QUERY);

  return {
    dashboard: data?.dashboardInfoBits ?? null,
    loading,
    error,
    refetch,
  };
}
