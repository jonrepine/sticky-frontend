import { useState, useCallback } from "react";
import {
  Text,
  Stack,
  Paper,
  Group,
  Button,
  Badge,
  Table,
  TextInput,
  Select,
  Code,
  Alert,
  ScrollArea,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useMutation, useLazyQuery, useQuery } from "@apollo/client";
import { CREATE_INFOBIT } from "../infobits/graphql";
import { CATEGORIES_QUERY } from "../categories/graphql";
import { DUE_INFOBITS, NEXT_REVIEW_CARD, SUBMIT_REVIEW } from "../review/graphql";
import type { Category, DueInfoBit, ReviewPrompt } from "../../types";

interface ReviewLogEntry {
  stepNumber: number;
  timestamp: string;
  rating: string;
  reviewEventId: string;
  nextDueAt: string;
  stateAfter: unknown;
}

export function ApiTester() {
  const { data: catData } = useQuery<{ categories: Category[] }>(CATEGORIES_QUERY);
  const categories = catData?.categories ?? [];

  const [createInfoBitMut, { loading: creating }] = useMutation(CREATE_INFOBIT);
  const [submitReviewMut] = useMutation(SUBMIT_REVIEW);
  const [fetchDue] = useLazyQuery<{ dueInfoBits: DueInfoBit[] }>(DUE_INFOBITS, {
    fetchPolicy: "network-only",
  });
  const [fetchCard] = useLazyQuery<{ nextReviewCard: ReviewPrompt }>(
    NEXT_REVIEW_CARD,
    { fetchPolicy: "network-only" }
  );

  const [title, setTitle] = useState("FSRS Test Item");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [front, setFront] = useState("Test front");
  const [back, setBack] = useState("Test back");

  const [createdInfoBitId, setCreatedInfoBitId] = useState<string | null>(null);
  const [createdCardId, setCreatedCardId] = useState<string | null>(null);
  const [dueItems, setDueItems] = useState<DueInfoBit[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<ReviewPrompt | null>(null);
  const [reviewLog, setReviewLog] = useState<ReviewLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!categoryId) return;
    setError(null);
    try {
      const { data } = await createInfoBitMut({
        variables: {
          input: {
            title,
            categoryId,
            cards: [
              {
                frontBlocks: [{ type: "text", text: front }],
                backBlocks: [{ type: "text", text: back }],
              },
            ],
          },
        },
      });
      const ib = data?.createInfoBit;
      if (ib) {
        setCreatedInfoBitId(ib.infoBitId);
        setCreatedCardId(ib.cards[0]?.cardId ?? null);
        setReviewLog([]);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, [categoryId, title, front, back, createInfoBitMut]);

  const handleCheckDue = useCallback(async () => {
    setError(null);
    try {
      const { data } = await fetchDue({ variables: { limit: 50 } });
      setDueItems(data?.dueInfoBits ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, [fetchDue]);

  const handleFetchCard = useCallback(
    async (infoBitId: string) => {
      setError(null);
      try {
        const { data } = await fetchCard({ variables: { id: infoBitId } });
        if (data?.nextReviewCard) {
          setCurrentPrompt(data.nextReviewCard);
          setCreatedCardId(data.nextReviewCard.card.cardId);
        }
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    },
    [fetchCard]
  );

  const handleSubmitReview = useCallback(
    async (rating: string) => {
      if (!createdInfoBitId || !createdCardId) return;
      setError(null);
      setLoading(true);
      try {
        const { data } = await submitReviewMut({
          variables: {
            input: {
              infoBitId: createdInfoBitId,
              cardId: createdCardId,
              rating,
              responseMs: 2000,
            },
          },
        });
        const result = data?.submitReview;
        if (result) {
          setReviewLog((prev) => [
            ...prev,
            {
              stepNumber: prev.length + 1,
              timestamp: new Date().toISOString(),
              rating,
              reviewEventId: result.reviewEventId,
              nextDueAt: result.nextDueAt,
              stateAfter: result.stateAfter,
            },
          ]);
          setCurrentPrompt(null);
        }
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [createdInfoBitId, createdCardId, submitReviewMut]
  );

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          API Flow Tester
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Create a test InfoBit via the API, then submit reviews and inspect the
          full FSRS state returned by the backend. Use this to verify the
          backend's FSRS implementation.
        </Text>

        {error && (
          <Alert icon={<IconAlertCircle />} color="red" mb="md" variant="light">
            {error}
          </Alert>
        )}

        <Stack gap="sm">
          <Group grow>
            <TextInput
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
            />
            <Select
              label="Category"
              data={categories.map((c) => ({
                value: c.categoryId,
                label: c.name,
              }))}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Pick one"
            />
          </Group>
          <Group grow>
            <TextInput
              label="Card front"
              value={front}
              onChange={(e) => setFront(e.currentTarget.value)}
            />
            <TextInput
              label="Card back"
              value={back}
              onChange={(e) => setBack(e.currentTarget.value)}
            />
          </Group>
          <Button onClick={handleCreate} loading={creating} w="fit-content">
            Create Test InfoBit
          </Button>
        </Stack>
      </Paper>

      {createdInfoBitId && (
        <Alert color="green" variant="light" icon={<IconCheck />}>
          Created InfoBit: <Code>{createdInfoBitId}</Code>
          {createdCardId && (
            <>
              {" "}
              | Card: <Code>{createdCardId}</Code>
            </>
          )}
        </Alert>
      )}

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Due Queue</Text>
          <Button variant="light" size="sm" onClick={handleCheckDue}>
            Refresh Due Items
          </Button>
        </Group>
        {dueItems.length === 0 ? (
          <Text size="sm" c="dimmed">
            No due items (click refresh)
          </Text>
        ) : (
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Due At</Table.Th>
                <Table.Th>InfoBit ID</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {dueItems.map((item) => (
                <Table.Tr key={item.infoBitId}>
                  <Table.Td>{item.title}</Table.Td>
                  <Table.Td>
                    <Code>{new Date(item.dueAt).toLocaleString()}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Code>{item.infoBitId.slice(0, 8)}...</Code>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => handleFetchCard(item.infoBitId)}
                    >
                      Get Card
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {currentPrompt && (
        <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
          <Text fw={600} mb="sm">
            Review Card
          </Text>
          <Group mb="md">
            <div>
              <Text size="xs" c="dimmed">
                Front
              </Text>
              <Text>
                {currentPrompt.card.frontBlocks
                  .map((b) => ("text" in b ? b.text : ""))
                  .join(" ")}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Back
              </Text>
              <Text>
                {currentPrompt.card.backBlocks
                  .map((b) => ("text" in b ? b.text : ""))
                  .join(" ")}
              </Text>
            </div>
          </Group>
          <Group>
            {["AGAIN", "HARD", "GOOD", "EASY"].map((r) => (
              <Button
                key={r}
                color={
                  r === "AGAIN"
                    ? "red"
                    : r === "HARD"
                      ? "orange"
                      : r === "GOOD"
                        ? "blue"
                        : "green"
                }
                onClick={() => handleSubmitReview(r)}
                loading={loading}
              >
                {r}
              </Button>
            ))}
          </Group>
        </Paper>
      )}

      {reviewLog.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">
            Review History (API Responses)
          </Text>
          <ScrollArea>
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Rating</Table.Th>
                  <Table.Th>Next Due</Table.Th>
                  <Table.Th>State After (raw)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {reviewLog.map((entry) => (
                  <Table.Tr key={entry.stepNumber}>
                    <Table.Td>{entry.stepNumber}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          entry.rating === "AGAIN"
                            ? "red"
                            : entry.rating === "HARD"
                              ? "orange"
                              : entry.rating === "GOOD"
                                ? "blue"
                                : "green"
                        }
                      >
                        {entry.rating}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Code>
                        {new Date(entry.nextDueAt).toLocaleString()}
                      </Code>
                    </Table.Td>
                    <Table.Td>
                      <Code block>
                        {typeof entry.stateAfter === "string"
                          ? entry.stateAfter
                          : JSON.stringify(entry.stateAfter, null, 2)}
                      </Code>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {createdInfoBitId && (
            <Group mt="md">
              <Button
                variant="light"
                onClick={() => handleFetchCard(createdInfoBitId)}
              >
                Get Card Again (for next review)
              </Button>
              <Button variant="light" onClick={handleCheckDue}>
                Check if Due
              </Button>
            </Group>
          )}
        </Paper>
      )}
    </Stack>
  );
}
