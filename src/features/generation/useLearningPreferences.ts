import { useMutation, useQuery } from "@apollo/client";
import type { UserLearningPreferences } from "../../types";
import { MY_LEARNING_PREFERENCES, UPDATE_LEARNING_PREFERENCES } from "./graphql";

interface LearningPreferencesQueryData {
  myLearningPreferences: UserLearningPreferences;
}

interface UpdateLearningPreferencesInput {
  newSessionDefaultCategoryId?: string | null;
  defaultSocraticEnabled?: boolean;
  defaultTags?: string[];
}

interface UpdateLearningPreferencesMutationData {
  updateLearningPreferences: UserLearningPreferences;
}

export function useLearningPreferences() {
  const {
    data,
    loading,
    error,
    refetch: refetchPreferences,
  } = useQuery<LearningPreferencesQueryData>(MY_LEARNING_PREFERENCES, {
    fetchPolicy: "cache-and-network",
  });

  const [updateMut, { loading: saving, error: saveError }] = useMutation<
    UpdateLearningPreferencesMutationData,
    { input: UpdateLearningPreferencesInput }
  >(UPDATE_LEARNING_PREFERENCES);

  const updatePreferences = async (input: UpdateLearningPreferencesInput) => {
    const { data: mutationData } = await updateMut({ variables: { input } });
    return mutationData?.updateLearningPreferences ?? null;
  };

  return {
    preferences: data?.myLearningPreferences ?? null,
    loading,
    error: error ?? saveError,
    saving,
    updatePreferences,
    refetchPreferences,
  };
}
