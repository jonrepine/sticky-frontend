import { gql } from "@apollo/client";

const INFOBIT_FIELDS = gql`
  fragment InfoBitFields on InfoBit {
    infoBitId
    title
    status
    dueAt
    createdAt
    noteSpec
    category {
      categoryId
      name
      slug
      doctrineVersion
      memoryArchetype
    }
    tags
    cards {
      cardId
      status
      frontBlocks {
        type
        text
      }
      backBlocks {
        type
        text
      }
    }
  }
`;

export const CREATE_INFOBIT = gql`
  ${INFOBIT_FIELDS}
  mutation CreateInfoBit($input: CreateInfoBitInput!) {
    createInfoBit(input: $input) {
      ...InfoBitFields
    }
  }
`;

export const INFOBITS_QUERY = gql`
  ${INFOBIT_FIELDS}
  query InfoBits($cursor: String, $limit: Int, $categoryId: ID, $status: InfoBitStatus) {
    infoBits(cursor: $cursor, limit: $limit, categoryId: $categoryId, status: $status) {
      edges {
        ...InfoBitFields
      }
      nextCursor
    }
  }
`;

export const INFOBIT_QUERY = gql`
  ${INFOBIT_FIELDS}
  query InfoBit($id: ID!) {
    infoBit(infoBitId: $id) {
      ...InfoBitFields
    }
  }
`;

export const UPDATE_INFOBIT = gql`
  mutation UpdateInfoBit($input: UpdateInfoBitInput!) {
    updateInfoBit(input: $input) {
      infoBitId
      title
      tags
      category {
        categoryId
        name
      }
    }
  }
`;

export const ARCHIVE_INFOBIT = gql`
  mutation ArchiveInfoBit($id: ID!) {
    archiveInfoBit(infoBitId: $id) {
      infoBitId
      status
    }
  }
`;

export const DELETE_INFOBIT = gql`
  mutation DeleteInfoBit($id: ID!) {
    deleteInfoBit(infoBitId: $id) {
      infoBitId
      status
    }
  }
`;

export const MARK_MASTERED = gql`
  mutation MarkMastered($id: ID!) {
    markInfoBitMastered(infoBitId: $id) {
      infoBitId
      status
    }
  }
`;
