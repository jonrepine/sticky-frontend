import { gql } from "@apollo/client";

export const FLAGS_QUERY = gql`
  query Flags($status: FlagStatus, $entityType: FlagEntityType) {
    flags(status: $status, entityType: $entityType) {
      flagId
      entityType
      entityId
      flagType
      note
      status
      createdAt
    }
  }
`;

export const CREATE_FLAG = gql`
  mutation CreateFlag($input: CreateFlagInput!) {
    createFlag(input: $input) {
      flagId
      entityType
      entityId
      flagType
      note
      status
      createdAt
    }
  }
`;

export const RESOLVE_FLAG = gql`
  mutation ResolveFlag($id: ID!) {
    resolveFlag(flagId: $id) {
      flagId
      status
      resolvedAt
    }
  }
`;
