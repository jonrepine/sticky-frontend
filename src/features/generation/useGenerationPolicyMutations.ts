import { useMutation } from "@apollo/client";
import type {
  GenerationPolicy,
  GenerationPolicyConfig,
  GenerationPolicyScope,
} from "../../types";
import { REMOVE_GENERATION_POLICY, UPSERT_GENERATION_POLICY } from "./graphql";

interface UpsertGenerationPolicyInput {
  scope: GenerationPolicyScope;
  categoryId?: string;
  infoBitId?: string;
  config: GenerationPolicyConfig;
}

interface UpsertGenerationPolicyMutationData {
  upsertGenerationPolicy: GenerationPolicy;
}

interface RemoveGenerationPolicyMutationData {
  removeGenerationPolicy: boolean;
}

export function useGenerationPolicyMutations() {
  const [upsertMut, { loading: upserting, error: upsertError }] = useMutation<
    UpsertGenerationPolicyMutationData,
    { input: UpsertGenerationPolicyInput }
  >(UPSERT_GENERATION_POLICY);

  const [removeMut, { loading: removing, error: removeError }] = useMutation<
    RemoveGenerationPolicyMutationData,
    { policyId: string }
  >(REMOVE_GENERATION_POLICY);

  const upsertGenerationPolicy = async (input: UpsertGenerationPolicyInput) => {
    const { data } = await upsertMut({ variables: { input } });
    return data?.upsertGenerationPolicy ?? null;
  };

  const removeGenerationPolicy = async (policyId: string) => {
    const { data } = await removeMut({ variables: { policyId } });
    return Boolean(data?.removeGenerationPolicy);
  };

  return {
    upsertGenerationPolicy,
    removeGenerationPolicy,
    upserting,
    removing,
    error: upsertError ?? removeError,
  };
}
