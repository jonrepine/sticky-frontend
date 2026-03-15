import { useMutation } from "@apollo/client";
import {
  UPDATE_INFOBIT,
  ARCHIVE_INFOBIT,
  DELETE_INFOBIT,
  MARK_MASTERED,
  INFOBITS_QUERY,
} from "./graphql";

export function useInfoBitActions() {
  const refetch = { refetchQueries: [{ query: INFOBITS_QUERY }] };

  const [updateMut, { loading: updateLoading }] = useMutation(
    UPDATE_INFOBIT,
    refetch
  );
  const [archiveMut, { loading: archiveLoading }] = useMutation(
    ARCHIVE_INFOBIT,
    refetch
  );
  const [deleteMut, { loading: deleteLoading }] = useMutation(
    DELETE_INFOBIT,
    refetch
  );
  const [masterMut, { loading: masterLoading }] = useMutation(
    MARK_MASTERED,
    refetch
  );

  return {
    updateInfoBit: (input: {
      infoBitId: string;
      title?: string;
      categoryId?: string;
      tags?: string[];
    }) => updateMut({ variables: { input } }),
    archiveInfoBit: (id: string) => archiveMut({ variables: { id } }),
    deleteInfoBit: (id: string) => deleteMut({ variables: { id } }),
    markMastered: (id: string) => masterMut({ variables: { id } }),
    loading: updateLoading || archiveLoading || deleteLoading || masterLoading,
  };
}
