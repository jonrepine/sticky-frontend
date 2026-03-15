import { gql } from "@apollo/client";

export const ADD_CARD = gql`
  mutation AddCard($id: ID!, $input: CreateCardInput!) {
    addCard(infoBitId: $id, input: $input) {
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

export const UPDATE_CARD_CONTENT = gql`
  mutation UpdateCardContent($input: UpdateCardInput!) {
    updateCardContent(input: $input) {
      cardId
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

export const ARCHIVE_CARD = gql`
  mutation ArchiveCard($id: ID!) {
    archiveCard(cardId: $id) {
      cardId
      status
    }
  }
`;

export const DELETE_CARD = gql`
  mutation DeleteCard($id: ID!) {
    deleteCard(cardId: $id) {
      cardId
      status
    }
  }
`;
