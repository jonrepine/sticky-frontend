import { useQuery, useMutation } from "@apollo/client";
import { TAGS_QUERY, ARCHIVE_TAG, DELETE_TAG } from "./graphql";
import type { Tag } from "../../types";

export function useTags() {
  const { data, loading, error, refetch } = useQuery<{ tags: Tag[] }>(
    TAGS_QUERY
  );

  const [archiveMut] = useMutation(ARCHIVE_TAG, {
    refetchQueries: [{ query: TAGS_QUERY }],
  });
  const [deleteMut] = useMutation(DELETE_TAG, {
    refetchQueries: [{ query: TAGS_QUERY }],
  });

  return {
    tags: data?.tags ?? [],
    loading,
    error,
    refetch,
    archiveTag: (tagId: string) => archiveMut({ variables: { id: tagId } }),
    deleteTag: (tagId: string) => deleteMut({ variables: { id: tagId } }),
  };
}
