import { useApolloClient } from "@apollo/client";
import { useEffect, useState } from "react";
import type { HealthStatus } from "../../types";
import { HEALTH, HEALTH_WITH_FEATURE_FLAGS } from "./graphql";

interface HealthQueryData {
  health: HealthStatus;
}

export function useHealthStatus() {
  const client = useApolloClient();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const { data } = await client.query<HealthQueryData>({
          query: HEALTH_WITH_FEATURE_FLAGS,
          fetchPolicy: "network-only",
        });
        if (!active) return;
        setHealth(data?.health ?? null);
        setError(null);
      } catch {
        try {
          const { data } = await client.query<HealthQueryData>({
            query: HEALTH,
            fetchPolicy: "network-only",
          });
          if (!active) return;
          const baseHealth = data?.health ?? null;
          setHealth(baseHealth ? { ...baseHealth, featureFlags: null } : null);
          setError(null);
        } catch (fallbackError) {
          if (!active) return;
          setHealth(null);
          setError(fallbackError as Error);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHealth();

    return () => {
      active = false;
    };
  }, [client]);

  return { health, loading, error };
}

