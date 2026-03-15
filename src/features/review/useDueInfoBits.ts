import { useQuery } from "@apollo/client";
import { DUE_INFOBITS, DUE_QUEUE } from "./graphql";
import type { DueInfoBit, DueQueueKind } from "../../types";

interface DueQueueQueryData {
  dueQueue: DueInfoBit[];
}

interface DueInfoBitsQueryData {
  dueInfoBits: DueInfoBit[];
}

export function useDueInfoBits(kind: DueQueueKind = "ALL", limit = 50) {
  const queueQuery = useQuery<DueQueueQueryData>(DUE_QUEUE, {
    variables: { kind, limit },
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });

  const shouldUseLegacyFallback =
    kind === "ALL" && Boolean(queueQuery.error) && (queueQuery.data?.dueQueue?.length ?? 0) === 0;

  const legacyQuery = useQuery<DueInfoBitsQueryData>(DUE_INFOBITS, {
    variables: { limit },
    fetchPolicy: "network-only",
    errorPolicy: "all",
    skip: !shouldUseLegacyFallback,
  });

  const dueInfoBits = queueQuery.data?.dueQueue ?? legacyQuery.data?.dueInfoBits ?? [];
  const loading = queueQuery.loading || (shouldUseLegacyFallback && legacyQuery.loading);
  const error = shouldUseLegacyFallback ? legacyQuery.error ?? queueQuery.error : queueQuery.error;
  const stateAwareQueueUnavailable = kind !== "ALL" && Boolean(queueQuery.error) && dueInfoBits.length === 0;

  const refetch = async () => {
    await queueQuery.refetch({ kind, limit });
    if (shouldUseLegacyFallback) {
      await legacyQuery.refetch({ limit });
    }
  };

  return {
    dueInfoBits,
    loading,
    error,
    refetch,
    stateAwareQueueUnavailable,
  };
}
