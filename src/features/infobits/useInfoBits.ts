import { useQuery } from "@apollo/client";
import { INFOBITS_QUERY } from "./graphql";
import type { InfoBitConnection, InfoBitStatus } from "../../types";

interface Variables {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  status?: InfoBitStatus;
}

export function useInfoBits(variables: Variables = {}) {
  const { data, loading, error, fetchMore } = useQuery<{
    infoBits: InfoBitConnection;
  }>(INFOBITS_QUERY, {
    variables: { limit: 20, ...variables },
  });

  const loadMore = () => {
    const cursor = data?.infoBits.nextCursor;
    if (!cursor) return;
    fetchMore({ variables: { ...variables, cursor } });
  };

  return {
    infoBits: data?.infoBits.edges ?? [],
    nextCursor: data?.infoBits.nextCursor ?? null,
    loading,
    error,
    loadMore,
  };
}
