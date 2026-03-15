import { gql } from "@apollo/client";

export const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      categoryId
      name
      slug
      ownerType
      isActive
      doctrineVersion
      memoryArchetype
    }
  }
`;
