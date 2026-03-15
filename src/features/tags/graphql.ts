import { gql } from "@apollo/client";

export const TAGS_QUERY = gql`
  query Tags {
    tags {
      tagId
      name
      slug
      isActive
      archivedAt
    }
  }
`;

export const ATTACH_TAGS = gql`
  mutation AttachTags($id: ID!, $tags: [String!]!) {
    attachTags(infoBitId: $id, tags: $tags) {
      infoBitId
      tags
    }
  }
`;

export const DETACH_TAGS = gql`
  mutation DetachTags($id: ID!, $tagIds: [ID!]!) {
    detachTags(infoBitId: $id, tagIds: $tagIds) {
      infoBitId
      tags
    }
  }
`;

export const ARCHIVE_TAG = gql`
  mutation ArchiveTag($id: ID!) {
    archiveTag(tagId: $id) {
      tagId
      isActive
      archivedAt
    }
  }
`;

export const DELETE_TAG = gql`
  mutation DeleteTag($id: ID!) {
    deleteTag(tagId: $id) {
      tagId
      isActive
    }
  }
`;
