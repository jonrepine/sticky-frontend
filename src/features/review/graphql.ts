import { gql } from "@apollo/client";

export const DUE_QUEUE = gql`
  query DueQueue($kind: DueQueueKind!, $limit: Int) {
    dueQueue(kind: $kind, limit: $limit) {
      infoBitId
      title
      dueAt
      fsrsState
      reps
      lapses
    }
  }
`;

export const DUE_INFOBITS = gql`
  query DueInfoBits($limit: Int) {
    dueInfoBits(limit: $limit) {
      infoBitId
      title
      dueAt
    }
  }
`;

export const NEXT_REVIEW_CARD = gql`
  query NextReviewCard($id: ID!) {
    nextReviewCard(infoBitId: $id) {
      infoBitId
      card {
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
      dueAt
      allowedRatings
      ratingPreviews {
        rating
        nextDueAt
        scheduledDays
        newStability
        newDifficulty
        newState
      }
    }
  }
`;

export const SUBMIT_REVIEW = gql`
  mutation SubmitReview($input: SubmitReviewInput!) {
    submitReview(input: $input) {
      reviewEventId
      nextDueAt
      stateAfter
    }
  }
`;

export const REVIEW_OUTCOME_PREVIEW = gql`
  query ReviewOutcomePreview($input: ReviewOutcomePreviewInput!) {
    reviewOutcomePreview(input: $input) {
      infoBitId
      cardId
      asOf
      outcomes {
        rating
        nextDueAt
        scheduledSeconds
        stateAfter
        displayText
        isEstimate
      }
    }
  }
`;
