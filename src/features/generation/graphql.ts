import { gql } from "@apollo/client";

export const GENERATION_POLICY_BY_CATEGORY = gql`
  query GenerationPolicyByCategory($categoryId: ID!) {
    generationPolicyByCategory(categoryId: $categoryId) {
      policyId
      scope
      categoryId
      infoBitId
      isActive
      config
      updatedAt
    }
  }
`;

export const UPSERT_GENERATION_POLICY = gql`
  mutation UpsertGenerationPolicy($input: UpsertGenerationPolicyInput!) {
    upsertGenerationPolicy(input: $input) {
      policyId
      scope
      categoryId
      infoBitId
      isActive
      config
      updatedAt
    }
  }
`;

export const REMOVE_GENERATION_POLICY = gql`
  mutation RemoveGenerationPolicy($policyId: ID!) {
    removeGenerationPolicy(policyId: $policyId)
  }
`;

export const MY_LEARNING_PREFERENCES = gql`
  query MyLearningPreferences {
    myLearningPreferences {
      newSessionDefaultCategoryId
      defaultSocraticEnabled
      defaultTags
      updatedAt
    }
  }
`;

export const UPDATE_LEARNING_PREFERENCES = gql`
  mutation UpdateLearningPreferences($input: UpdateLearningPreferencesInput!) {
    updateLearningPreferences(input: $input) {
      newSessionDefaultCategoryId
      defaultSocraticEnabled
      defaultTags
      updatedAt
    }
  }
`;

export const VALIDATE_NOTE_SPEC = gql`
  query ValidateNoteSpec($infoBitId: ID!) {
    validateNoteSpec(infoBitId: $infoBitId) {
      isValid
      checks {
        name
        passed
        message
      }
    }
  }
`;
