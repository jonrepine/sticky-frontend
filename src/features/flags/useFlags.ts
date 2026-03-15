import { useQuery, useMutation } from "@apollo/client";
import { FLAGS_QUERY, CREATE_FLAG, RESOLVE_FLAG } from "./graphql";
import type { Flag, FlagEntityType, FlagType, FlagStatus } from "../../types";

export function useFlags(filters: { status?: FlagStatus; entityType?: FlagEntityType } = {}) {
  const { data, loading, error, refetch } = useQuery<{ flags: Flag[] }>(
    FLAGS_QUERY,
    { variables: filters }
  );

  const [createMut, { loading: creating }] = useMutation(CREATE_FLAG, {
    refetchQueries: [{ query: FLAGS_QUERY, variables: filters }],
  });

  const [resolveMut, { loading: resolving }] = useMutation(RESOLVE_FLAG, {
    refetchQueries: [{ query: FLAGS_QUERY, variables: filters }],
  });

  return {
    flags: data?.flags ?? [],
    loading,
    error,
    refetch,
    createFlag: (input: {
      entityType: FlagEntityType;
      entityId: string;
      flagType: FlagType;
      note?: string;
    }) => createMut({ variables: { input } }),
    resolveFlag: (flagId: string) =>
      resolveMut({ variables: { id: flagId } }),
    creating,
    resolving,
  };
}
