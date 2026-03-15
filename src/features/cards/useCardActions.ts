import { useMutation } from "@apollo/client";
import { ADD_CARD, UPDATE_CARD_CONTENT, ARCHIVE_CARD, DELETE_CARD } from "./graphql";
import { INFOBIT_QUERY } from "../infobits/graphql";

export function useCardActions(infoBitId: string) {
  const refetchOpts = {
    refetchQueries: [{ query: INFOBIT_QUERY, variables: { id: infoBitId } }],
  };

  const [addMut, { loading: addLoading }] = useMutation(ADD_CARD, refetchOpts);
  const [updateMut, { loading: updateLoading }] = useMutation(
    UPDATE_CARD_CONTENT,
    refetchOpts
  );
  const [archiveMut] = useMutation(ARCHIVE_CARD, refetchOpts);
  const [deleteMut] = useMutation(DELETE_CARD, refetchOpts);

  return {
    addCard: (input: {
      frontBlocks: { type: string; text: string }[];
      backBlocks: { type: string; text: string }[];
    }) => addMut({ variables: { id: infoBitId, input } }),

    updateCard: (input: {
      cardId: string;
      frontBlocks?: { type: string; text: string }[];
      backBlocks?: { type: string; text: string }[];
    }) => updateMut({ variables: { input } }),

    archiveCard: (cardId: string) =>
      archiveMut({ variables: { id: cardId } }),

    deleteCard: (cardId: string) =>
      deleteMut({ variables: { id: cardId } }),

    loading: addLoading || updateLoading,
  };
}
