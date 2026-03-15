import { useState, useCallback } from "react";
import {
  Text,
  Stack,
  Paper,
  Group,
  Button,
  Badge,
  Table,
  Alert,
  ScrollArea,
  Select,
  Loader,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useLazyQuery, useQuery } from "@apollo/client";
import { CREATE_INFOBIT } from "../infobits/graphql";
import { CATEGORIES_QUERY } from "../categories/graphql";
import { NEXT_REVIEW_CARD, SUBMIT_REVIEW } from "../review/graphql";
import type { Category, ReviewPrompt } from "../../types";
import {
  simulateNewCard,
  applyRating,
  stateLabel,
  Rating,
  type Card,
  type Grade,
} from "./fsrsLocal";

const RATING_MAP: Record<string, Grade> = {
  GOOD: Rating.Good,
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  EASY: Rating.Easy,
};

interface ComparisonRow {
  step: number;
  rating: string;
  local: {
    state: string;
    stability: number;
    difficulty: number;
    due: string;
    scheduled_days: number;
    reps: number;
    lapses: number;
  };
  api: {
    state: string;
    stability: number;
    difficulty: number;
    due: string;
    scheduled_days: number;
    reps: number;
    lapses: number;
  } | null;
  match: boolean | null;
}

const TEST_SEQUENCES = [
  {
    label: "New → Good × 3",
    ratings: ["GOOD", "GOOD", "GOOD"],
  },
  {
    label: "New → Again → Good → Good",
    ratings: ["AGAIN", "GOOD", "GOOD"],
  },
  {
    label: "New → Easy → Easy",
    ratings: ["EASY", "EASY"],
  },
  {
    label: "New → Hard → Good → Again → Good",
    ratings: ["HARD", "GOOD", "AGAIN", "GOOD"],
  },
  {
    label: "New → Good → Hard → Again → Good → Easy",
    ratings: ["GOOD", "HARD", "AGAIN", "GOOD", "EASY"],
  },
];

export function ComparisonRunner() {
  const { data: catData } = useQuery<{ categories: Category[] }>(CATEGORIES_QUERY);
  const categories = catData?.categories ?? [];

  const [createInfoBitMut] = useMutation(CREATE_INFOBIT);
  const [submitReviewMut] = useMutation(SUBMIT_REVIEW);
  const [fetchCard] = useLazyQuery<{ nextReviewCard: ReviewPrompt }>(
    NEXT_REVIEW_CARD,
    { fetchPolicy: "network-only" }
  );

  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const runComparison = useCallback(async () => {
    const test = TEST_SEQUENCES.find((t) => t.label === selectedTest);
    if (!test || !categoryId) return;

    setRunning(true);
    setError(null);
    setDone(false);
    setRows([]);

    try {
      // --- LOCAL simulation ---
      const now = new Date();
      let localCard: Card = simulateNewCard(now);
      const localResults: ComparisonRow[] = [];

      for (let i = 0; i < test.ratings.length; i++) {
        const ratingStr = test.ratings[i]!;
        const rating = RATING_MAP[ratingStr]!;
        const reviewDate =
          i === 0 ? now : new Date(localCard.due);

        const { card: newCard, snapshot } = applyRating(
          localCard,
          reviewDate,
          rating
        );
        localCard = newCard;

        localResults.push({
          step: i + 1,
          rating: ratingStr,
          local: {
            state: snapshot.stateLabel,
            stability: snapshot.stability,
            difficulty: snapshot.difficulty,
            due: snapshot.dueDate,
            scheduled_days: snapshot.scheduled_days,
            reps: snapshot.reps,
            lapses: snapshot.lapses,
          },
          api: null,
          match: null,
        });
      }

      setRows([...localResults]);

      // --- API simulation ---
      const { data: createData } = await createInfoBitMut({
        variables: {
          input: {
            title: `Compare: ${test.label} (${Date.now()})`,
            categoryId,
            cards: [
              {
                frontBlocks: [{ type: "text", text: "Comparison test front" }],
                backBlocks: [{ type: "text", text: "Comparison test back" }],
              },
            ],
          },
        },
      });

      const infoBitId = createData?.createInfoBit?.infoBitId;
      if (!infoBitId) throw new Error("Failed to create InfoBit via API");

      for (let i = 0; i < test.ratings.length; i++) {
        const ratingStr = test.ratings[i]!;

        // Fetch the card for review
        const { data: cardData } = await fetchCard({
          variables: { id: infoBitId },
        });
        const cardId = cardData?.nextReviewCard?.card?.cardId;
        if (!cardId) throw new Error(`No card returned for step ${i + 1}`);

        const { data: reviewData } = await submitReviewMut({
          variables: {
            input: {
              infoBitId,
              cardId,
              rating: ratingStr,
              responseMs: 2000,
            },
          },
        });

        const result = reviewData?.submitReview;
        if (!result) throw new Error(`No review result for step ${i + 1}`);

        const stateAfter =
          typeof result.stateAfter === "string"
            ? JSON.parse(result.stateAfter)
            : result.stateAfter;

        const apiData = {
          state: stateLabel(stateAfter?.state ?? -1),
          stability: stateAfter?.stability ?? 0,
          difficulty: stateAfter?.difficulty ?? 0,
          due: result.nextDueAt,
          scheduled_days: stateAfter?.scheduled_days ?? 0,
          reps: stateAfter?.reps ?? 0,
          lapses: stateAfter?.lapses ?? 0,
        };

        const localRow = localResults[i]!;
        const stabilityClose =
          Math.abs(localRow.local.stability - apiData.stability) < 0.1;
        const difficultyClose =
          Math.abs(localRow.local.difficulty - apiData.difficulty) < 0.5;
        const stateMatch = localRow.local.state === apiData.state;

        localResults[i] = {
          ...localRow,
          api: apiData,
          match: stabilityClose && difficultyClose && stateMatch,
        };

        setRows([...localResults]);

        // Small delay between API calls
        await new Promise((r) => setTimeout(r, 300));
      }

      setDone(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [
    selectedTest,
    categoryId,
    createInfoBitMut,
    submitReviewMut,
    fetchCard,
  ]);

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          Local vs API Comparison
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Run a predefined rating sequence through both the client-side ts-fsrs
          (v5) and your backend API, then compare the resulting FSRS states
          side-by-side. States, stability, and difficulty should be close
          (version differences may cause minor variance).
        </Text>

        {error && (
          <Alert icon={<IconAlertCircle />} color="red" mb="md" variant="light">
            {error}
          </Alert>
        )}

        <Group>
          <Select
            label="Test sequence"
            data={TEST_SEQUENCES.map((t) => t.label)}
            value={selectedTest}
            onChange={setSelectedTest}
            placeholder="Pick a test"
            w={300}
          />
          <Select
            label="Category (for API)"
            data={categories.map((c) => ({
              value: c.categoryId,
              label: c.name,
            }))}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Pick one"
            w={200}
          />
          <Button
            mt={24}
            onClick={runComparison}
            loading={running}
            disabled={!selectedTest || !categoryId}
          >
            Run Comparison
          </Button>
        </Group>
      </Paper>

      {rows.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Results</Text>
            {done && (
              <Badge
                color={rows.every((r) => r.match) ? "green" : "orange"}
                size="lg"
              >
                {rows.every((r) => r.match) ? "All match" : "Some differences"}
              </Badge>
            )}
          </Group>

          <ScrollArea>
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Rating</Table.Th>
                  <Table.Th>Local State</Table.Th>
                  <Table.Th>API State</Table.Th>
                  <Table.Th>Local S</Table.Th>
                  <Table.Th>API S</Table.Th>
                  <Table.Th>Local D</Table.Th>
                  <Table.Th>API D</Table.Th>
                  <Table.Th>Local Sched</Table.Th>
                  <Table.Th>API Sched</Table.Th>
                  <Table.Th>Match</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.step}>
                    <Table.Td>{row.step}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          row.rating === "AGAIN"
                            ? "red"
                            : row.rating === "HARD"
                              ? "orange"
                              : row.rating === "GOOD"
                                ? "blue"
                                : "green"
                        }
                        size="sm"
                      >
                        {row.rating}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{row.local.state}</Table.Td>
                    <Table.Td>
                      {row.api ? row.api.state : <Loader size="xs" />}
                    </Table.Td>
                    <Table.Td>{row.local.stability.toFixed(4)}</Table.Td>
                    <Table.Td>
                      {row.api ? row.api.stability.toFixed(4) : "—"}
                    </Table.Td>
                    <Table.Td>{row.local.difficulty.toFixed(4)}</Table.Td>
                    <Table.Td>
                      {row.api ? row.api.difficulty.toFixed(4) : "—"}
                    </Table.Td>
                    <Table.Td>{row.local.scheduled_days}d</Table.Td>
                    <Table.Td>
                      {row.api ? `${row.api.scheduled_days}d` : "—"}
                    </Table.Td>
                    <Table.Td>
                      {row.match === null ? (
                        "—"
                      ) : row.match ? (
                        <IconCheck size={16} color="green" />
                      ) : (
                        <IconX size={16} color="orange" />
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {done && (
            <Text size="sm" c="dimmed" mt="sm">
              Note: Minor differences in stability/difficulty are expected due to
              potential version differences between the client ts-fsrs (v5) and
              the backend's FSRS implementation. The key things to verify are
              that states match and values are in the same ballpark.
            </Text>
          )}
        </Paper>
      )}
    </Stack>
  );
}
