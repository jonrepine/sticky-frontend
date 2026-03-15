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

interface LoadedPromptResult {
  prompt: ReviewPrompt | null;
  outcomePreviews: ReviewOutcome[];
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

  const loadPrompt = useCallback(
    async (infoBitId: string): Promise<LoadedPromptResult> => {
      const { data } = await fetchCard({
        variables: { id: infoBitId },
      });
      const prompt = data?.nextReviewCard ?? null;
      if (!prompt) {
        return {
          prompt: null,
          outcomePreviews: [],
        };
      }

      return {
        prompt,
        outcomePreviews: await loadOutcomePreviews({
          infoBitId: prompt.infoBitId,
          cardId: prompt.card.cardId,
        }),
      };
    },
    [fetchCard, loadOutcomePreviews]
  );

  const hydrateOutcomePreviews = useCallback(
    async (prompt: ReviewPrompt) => {
      const outcomePreviews = await loadOutcomePreviews({
        infoBitId: prompt.infoBitId,
        cardId: prompt.card.cardId,
      });
      setState((current) => {
        if (
          current.prompt?.infoBitId !== prompt.infoBitId ||
          current.prompt.card.cardId !== prompt.card.cardId
        ) {
          return current;
        }
        return { ...current, outcomePreviews };
      });
    },
    [loadOutcomePreviews]
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
      const { prompt, outcomePreviews } = await loadPrompt(dueItems[0]!.infoBitId);
      if (prompt) {
        setState((s) => ({ ...s, prompt, outcomePreviews }));
        responseStart.current = Date.now();
      }
    },
    [loadPrompt]
  );

  const reveal = useCallback(() => {
    setState((s) => ({ ...s, revealed: true }));
  }, []);

  const submitRating = useCallback(
    async (rating: FsrsRating) => {
      if (!state.prompt) return;

      const responseMs = Date.now() - responseStart.current;
      const nextIndex = state.currentIndex + 1;
      const nextItem = nextIndex < state.queue.length ? state.queue[nextIndex] : null;
      const nextPromptPromise = nextItem
        ? fetchCard({
            variables: { id: nextItem.infoBitId },
          })
        : null;

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
        awaitRefetchQueries: false,
      });

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

      const nextPromptResult = nextPromptPromise ? await nextPromptPromise : null;
      const nextPrompt = nextPromptResult?.data?.nextReviewCard ?? null;

      setState((s) => ({
        ...s,
        currentIndex: nextIndex,
        prompt: nextPrompt,
        outcomePreviews: [],
        revealed: false,
        lastResult: data?.submitReview ?? null,
      }));
      if (nextPrompt) {
        responseStart.current = Date.now();
        void hydrateOutcomePreviews(nextPrompt);
      }
    },
    [state.prompt, state.currentIndex, state.queue, fetchCard, submitMut, hydrateOutcomePreviews]
  );

  return {
    ...state,
    totalCount: state.queue.length,
    startSession,
    reveal,
    submitRating,
  };
}
