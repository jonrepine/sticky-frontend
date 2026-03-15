import { useQuery, type ApolloError } from "@apollo/client";
import { DUE_INFOBITS, DUE_QUEUE } from "./graphql";
import type { DueInfoBit, DueQueueKind } from "../../types";

interface DueQueueQueryData {
  dueQueue: DueInfoBit[];
}

interface DueInfoBitsQueryData {
  dueInfoBits: DueInfoBit[];
}

export interface DueInfoBitsState {
  dueInfoBits: DueInfoBit[];
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
  stateAwareQueueUnavailable: boolean;
}

export function useDueInfoBits(kind: DueQueueKind = "ALL", limit = 50): DueInfoBitsState {
  const queueQuery = useQuery<DueQueueQueryData>(DUE_QUEUE, {
    variables: { kind, limit },
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    errorPolicy: "all",
    notifyOnNetworkStatusChange: false,
    returnPartialData: true,
  });

  const shouldUseLegacyFallback =
    kind === "ALL" && Boolean(queueQuery.error) && (queueQuery.data?.dueQueue?.length ?? 0) === 0;

  const legacyQuery = useQuery<DueInfoBitsQueryData>(DUE_INFOBITS, {
    variables: { limit },
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    errorPolicy: "all",
    skip: !shouldUseLegacyFallback,
    notifyOnNetworkStatusChange: false,
    returnPartialData: true,
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
