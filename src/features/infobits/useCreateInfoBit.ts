import { useMutation } from "@apollo/client";
import { CREATE_INFOBIT, INFOBITS_QUERY } from "./graphql";
import type { InfoBit } from "../../types";

interface CreateInput {
  title: string;
  categoryId: string;
  tags?: string[];
  originalContent?: string;
  noteSpec?: Record<string, unknown>;
  cards: {
    frontBlocks: { type: string; text: string }[];
    backBlocks: { type: string; text: string }[];
  }[];
}

export function useCreateInfoBit() {
  const [mutate, { loading, error }] = useMutation<{
    createInfoBit: InfoBit;
  }>(CREATE_INFOBIT, {
    refetchQueries: [{ query: INFOBITS_QUERY }],
  });

  const createInfoBit = async (input: CreateInput) => {
    const { data } = await mutate({ variables: { input } });
    return data?.createInfoBit;
  };

  return { createInfoBit, loading, error };
}
