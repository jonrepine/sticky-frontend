import { gql } from "@apollo/client";

export const SCHEDULER_POLICY_PREVIEW = gql`
  query PolicyPreview($id: ID!) {
    schedulerPolicyPreview(infoBitId: $id) {
      scope
      algorithmKey
      params
      sourcePolicyId
    }
  }
`;

export const UPSERT_SCHEDULER_POLICY = gql`
  mutation UpsertPolicy($input: UpsertSchedulerPolicyInput!) {
    upsertSchedulerPolicy(input: $input) {
      policyId
      scope
      algorithmKey
      params
      isActive
      applyMode
    }
  }
`;
