import { useQuery } from "@apollo/client";
import type { GenerationPolicy } from "../../types";
import { GENERATION_POLICY_BY_CATEGORY } from "./graphql";

interface GenerationPolicyByCategoryQueryData {
  generationPolicyByCategory: GenerationPolicy | null;
}

interface GenerationPolicyByCategoryQueryVars {
  categoryId: string;
}

export function useGenerationPolicyByCategory(categoryId: string | null) {
  const { data, loading, error, refetch } = useQuery<
    GenerationPolicyByCategoryQueryData,
    GenerationPolicyByCategoryQueryVars
  >(GENERATION_POLICY_BY_CATEGORY, {
    variables: categoryId ? { categoryId } : undefined,
    skip: !categoryId,
    fetchPolicy: "cache-and-network",
  });

  return {
    policy: data?.generationPolicyByCategory ?? null,
    loading,
    error,
    refetchPolicy: refetch,
  };
}
