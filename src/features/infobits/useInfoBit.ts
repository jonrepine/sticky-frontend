import { useQuery } from "@apollo/client";
import { INFOBIT_QUERY } from "./graphql";
import type { InfoBit } from "../../types";

export function useInfoBit(infoBitId: string) {
  const { data, loading, error, refetch } = useQuery<{
    infoBit: InfoBit | null;
  }>(INFOBIT_QUERY, {
    variables: { id: infoBitId },
    skip: !infoBitId,
  });

  return {
    infoBit: data?.infoBit ?? null,
    loading,
    error,
    refetch,
  };
}
