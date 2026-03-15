import { useState, useCallback, useRef } from "react";
import { useLazyQuery, useMutation } from "@apollo/client";
import {
  DUE_INFOBITS,
  DUE_QUEUE,
  NEXT_REVIEW_CARD,
  REVIEW_OUTCOME_PREVIEW,
  SUBMIT_REVIEW,
} from "./graphql";
import type {
  ReviewPrompt,
  ReviewResult,
  DueInfoBit,
  FsrsRating,
  ReviewOutcome,
  ReviewOutcomePreviewResult,
} from "../../types";

interface SessionState {
  queue: DueInfoBit[];
  currentIndex: number;
  prompt: ReviewPrompt | null;
  outcomePreviews: ReviewOutcome[];
  revealed: boolean;
  completed: boolean;
  lastResult: ReviewResult | null;
}

export function useReviewSession() {
  const [state, setState] = useState<SessionState>({
    queue: [],
    currentIndex: 0,
    prompt: null,
    outcomePreviews: [],
    revealed: false,
    completed: false,
    lastResult: null,
  });

  const responseStart = useRef<number>(0);

  const [fetchCard] = useLazyQuery<{ nextReviewCard: ReviewPrompt }>(
    NEXT_REVIEW_CARD,
    { fetchPolicy: "network-only" }
  );
  const [fetchOutcomePreview] = useLazyQuery<{ reviewOutcomePreview: ReviewOutcomePreviewResult }>(
    REVIEW_OUTCOME_PREVIEW,
    { fetchPolicy: "network-only" }
  );

  const [submitMut] = useMutation<{ submitReview: ReviewResult }>(
    SUBMIT_REVIEW
  );

  const loadOutcomePreviews = useCallback(
    async (input: { infoBitId: string; cardId: string }): Promise<ReviewOutcome[]> => {
      try {
        const { data } = await fetchOutcomePreview({
          variables: {
            input: {
              infoBitId: input.infoBitId,
              cardId: input.cardId,
            },
          },
        });
        return data?.reviewOutcomePreview?.outcomes ?? [];
      } catch {
        return [];
      }
    },
    [fetchOutcomePreview]
  );

  const startSession = useCallback(
    async (dueItems: DueInfoBit[]) => {
      if (dueItems.length === 0) {
        setState((s) => ({ ...s, completed: true, queue: [] }));
        return;
      }
      setState({
        queue: dueItems,
        currentIndex: 0,
        prompt: null,
        outcomePreviews: [],
        revealed: false,
        completed: false,
        lastResult: null,
      });
      const { data } = await fetchCard({
        variables: { id: dueItems[0]!.infoBitId },
      });
      if (data?.nextReviewCard) {
        const outcomePreviews = await loadOutcomePreviews({
          infoBitId: data.nextReviewCard.infoBitId,
          cardId: data.nextReviewCard.card.cardId,
        });
        setState((s) => ({ ...s, prompt: data.nextReviewCard, outcomePreviews }));
        responseStart.current = Date.now();
      }
    },
    [fetchCard, loadOutcomePreviews]
  );

  const reveal = useCallback(() => {
    setState((s) => ({ ...s, revealed: true }));
  }, []);

  const submitRating = useCallback(
    async (rating: FsrsRating) => {
      if (!state.prompt) return;

      const responseMs = Date.now() - responseStart.current;

      const { data } = await submitMut({
        variables: {
          input: {
            infoBitId: state.prompt.infoBitId,
            cardId: state.prompt.card.cardId,
            rating,
            responseMs,
          },
        },
        refetchQueries: [
          { query: DUE_QUEUE, variables: { kind: "LEARN", limit: 50 } },
          { query: DUE_QUEUE, variables: { kind: "REVIEW", limit: 50 } },
          { query: DUE_QUEUE, variables: { kind: "ALL", limit: 50 } },
          { query: DUE_INFOBITS, variables: { limit: 50 } },
        ],
        awaitRefetchQueries: true,
      });

      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        setState((s) => ({
          ...s,
          completed: true,
          lastResult: data?.submitReview ?? null,
          revealed: false,
          prompt: null,
          outcomePreviews: [],
        }));
        return;
      }

      const nextItem = state.queue[nextIndex]!;
      const { data: cardData } = await fetchCard({
        variables: { id: nextItem.infoBitId },
      });

      let outcomePreviews: ReviewOutcome[] = [];
      if (cardData?.nextReviewCard) {
        outcomePreviews = await loadOutcomePreviews({
          infoBitId: cardData.nextReviewCard.infoBitId,
          cardId: cardData.nextReviewCard.card.cardId,
        });
      }

      setState((s) => ({
        ...s,
        currentIndex: nextIndex,
        prompt: cardData?.nextReviewCard ?? null,
        outcomePreviews,
        revealed: false,
        lastResult: data?.submitReview ?? null,
      }));
      responseStart.current = Date.now();
    },
    [state.prompt, state.currentIndex, state.queue, fetchCard, submitMut, loadOutcomePreviews]
  );

  return {
    ...state,
    totalCount: state.queue.length,
    startSession,
    reveal,
    submitRating,
  };
}
