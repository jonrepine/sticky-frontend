import { useApolloClient } from "@apollo/client";
import { useCallback } from "react";
import type { NoteSpecValidationResult } from "../../types";
import { VALIDATE_NOTE_SPEC } from "./graphql";

interface ValidateNoteSpecQueryData {
  validateNoteSpec: NoteSpecValidationResult;
}

interface ValidateNoteSpecQueryVars {
  infoBitId: string;
}

export function useValidateNoteSpec() {
  const client = useApolloClient();

  const validateNoteSpec = useCallback(
    async (infoBitId: string): Promise<NoteSpecValidationResult | null> => {
      try {
        const { data } = await client.query<ValidateNoteSpecQueryData, ValidateNoteSpecQueryVars>({
          query: VALIDATE_NOTE_SPEC,
          variables: { infoBitId },
          fetchPolicy: "network-only",
        });
        return data?.validateNoteSpec ?? null;
      } catch {
        return null;
      }
    },
    [client]
  );

  return { validateNoteSpec };
}

