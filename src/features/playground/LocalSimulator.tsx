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
  Code,
  ScrollArea,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconTrash, IconPlayerPlay } from "@tabler/icons-react";
import {
  simulateNewCard,
  getOutcomesForAllRatings,
  applyRating,
  stateLabel,
  type Card,
  type Grade,
  type ReviewSnapshot,
} from "./fsrsLocal";

interface ReviewStep {
  stepNumber: number;
  reviewDate: string;
  cardBefore: Card;
  outcomes: ReviewSnapshot[];
  selectedRating: string | null;
  selectedOutcome: ReviewSnapshot | null;
}

export function LocalSimulator() {
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [steps, setSteps] = useState<ReviewStep[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [nextReviewDate, setNextReviewDate] = useState("");

  const handleStart = useCallback(() => {
    const date = new Date(startDate);
    const card = simulateNewCard(date);
    const outcomes = getOutcomesForAllRatings(card, date);
    setCurrentCard(card);
    setSteps([
      {
        stepNumber: 1,
        reviewDate: date.toISOString(),
        cardBefore: card,
        outcomes,
        selectedRating: null,
        selectedOutcome: null,
      },
    ]);
    setNextReviewDate("");
  }, [startDate]);

  const handleSelectRating = useCallback(
    (stepIdx: number, rating: Grade) => {
      const step = steps[stepIdx];
      if (!step) return;

      const { card: newCard, snapshot } = applyRating(
        step.cardBefore,
        new Date(step.reviewDate),
        rating
      );

      const updatedSteps = steps.slice(0, stepIdx + 1);
      updatedSteps[stepIdx] = {
        ...step,
        selectedRating: snapshot.rating,
        selectedOutcome: snapshot,
      };

      setCurrentCard(newCard);
      setSteps(updatedSteps);
      setNextReviewDate(newCard.due.toISOString().slice(0, 16));
    },
    [steps]
  );

  const handleAddReview = useCallback(() => {
    if (!currentCard || !nextReviewDate) return;
    const reviewDate = new Date(nextReviewDate);
    const outcomes = getOutcomesForAllRatings(currentCard, reviewDate);
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        reviewDate: reviewDate.toISOString(),
        cardBefore: currentCard,
        outcomes,
        selectedRating: null,
        selectedOutcome: null,
      },
    ]);
  }, [currentCard, nextReviewDate]);

  const handleReset = useCallback(() => {
    setSteps([]);
    setCurrentCard(null);
    setNextReviewDate("");
  }, []);

  const lastStep = steps[steps.length - 1];
  const canAddReview = lastStep?.selectedOutcome && nextReviewDate;

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          Client-side FSRS Simulator (ts-fsrs v5, fuzz off)
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Create a virtual card, pick a start date, then step through reviews by
          choosing ratings. See exactly how the FSRS state changes at each step.
        </Text>
        <Group>
          <TextInput
            label="Card creation date"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.currentTarget.value)}
            w={250}
          />
          <Button
            mt={24}
            onClick={handleStart}
            leftSection={<IconPlayerPlay size={16} />}
          >
            Start Simulation
          </Button>
          {steps.length > 0 && (
            <Tooltip label="Reset simulation">
              <ActionIcon
                aria-label="Reset simulation"
                mt={24}
                variant="light"
                color="red"
                onClick={handleReset}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Paper>

      {currentCard && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="xs">
            Current Card State
          </Text>
          <CardStateTable card={currentCard} />
        </Paper>
      )}

      {steps.map((step, idx) => (
        <Paper key={idx} withBorder p="md" radius="md">
          <Group justify="space-between" mb="sm">
            <Group>
              <Badge variant="filled" size="lg">
                Review #{step.stepNumber}
              </Badge>
              <Text size="sm">
                {new Date(step.reviewDate).toLocaleString()}
              </Text>
            </Group>
            <Badge
              variant="light"
              color={step.selectedRating ? "green" : "gray"}
            >
              {step.selectedRating ?? "Awaiting rating"}
            </Badge>
          </Group>

          <Text size="sm" fw={500} mb="xs">
            Possible outcomes for each rating:
          </Text>

          <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Rating</Table.Th>
                  <Table.Th>State After</Table.Th>
                  <Table.Th>Next Due</Table.Th>
                  <Table.Th>Stability</Table.Th>
                  <Table.Th>Difficulty</Table.Th>
                  <Table.Th>Sched. Days</Table.Th>
                  <Table.Th>Reps</Table.Th>
                  <Table.Th>Lapses</Table.Th>
                  <Table.Th>Steps</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {step.outcomes.map((o) => {
                  const isSelected = step.selectedRating === o.rating;
                  return (
                    <Table.Tr
                      key={o.ratingValue}
                      bg={
                        isSelected
                          ? "var(--mantine-color-violet-light)"
                          : undefined
                      }
                    >
                      <Table.Td>
                        <Badge
                          color={ratingColor(o.ratingValue)}
                          variant="filled"
                        >
                          {o.rating}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{o.stateLabel}</Table.Td>
                      <Table.Td>
                        <Code>{formatDue(o.dueDate)}</Code>
                      </Table.Td>
                      <Table.Td>{o.stability.toFixed(4)}</Table.Td>
                      <Table.Td>{o.difficulty.toFixed(4)}</Table.Td>
                      <Table.Td>{o.scheduled_days}</Table.Td>
                      <Table.Td>{o.reps}</Table.Td>
                      <Table.Td>{o.lapses}</Table.Td>
                      <Table.Td>{o.learning_steps}</Table.Td>
                      <Table.Td>
                        {!step.selectedRating && (
                          <Button
                            size="xs"
                            variant="light"
                            color={ratingColor(o.ratingValue)}
                            onClick={() =>
                              handleSelectRating(idx, o.ratingValue as Grade)
                            }
                          >
                            Select
                          </Button>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      ))}

      {lastStep?.selectedOutcome && (
        <Paper withBorder p="md" radius="md" bg="var(--mantine-color-dark-7)">
          <Text fw={600} mb="sm">
            Schedule Next Review
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            The card is due on{" "}
            <Code>{formatDue(lastStep.selectedOutcome.dueDate)}</Code>. You can
            review at that time or any other time to see how overdue/early
            reviews affect scheduling.
          </Text>
          <Group>
            <TextInput
              label="Next review date"
              type="datetime-local"
              value={nextReviewDate}
              onChange={(e) => setNextReviewDate(e.currentTarget.value)}
              w={250}
            />
            <Button
              mt={24}
              onClick={handleAddReview}
              disabled={!canAddReview}
              variant="light"
            >
              Add Review Step
            </Button>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}

function CardStateTable({ card }: { card: Card }) {
  return (
    <Table withTableBorder>
      <Table.Tbody>
        <Table.Tr>
          <Table.Td fw={500}>State</Table.Td>
          <Table.Td>{stateLabel(card.state)}</Table.Td>
          <Table.Td fw={500}>Due</Table.Td>
          <Table.Td>
            <Code>{formatDue(card.due.toISOString())}</Code>
          </Table.Td>
        </Table.Tr>
        <Table.Tr>
          <Table.Td fw={500}>Stability</Table.Td>
          <Table.Td>{card.stability.toFixed(4)}</Table.Td>
          <Table.Td fw={500}>Difficulty</Table.Td>
          <Table.Td>{card.difficulty.toFixed(4)}</Table.Td>
        </Table.Tr>
        <Table.Tr>
          <Table.Td fw={500}>Reps</Table.Td>
          <Table.Td>{card.reps}</Table.Td>
          <Table.Td fw={500}>Lapses</Table.Td>
          <Table.Td>{card.lapses}</Table.Td>
        </Table.Tr>
        <Table.Tr>
          <Table.Td fw={500}>Elapsed Days</Table.Td>
          <Table.Td>{card.elapsed_days}</Table.Td>
          <Table.Td fw={500}>Scheduled Days</Table.Td>
          <Table.Td>{card.scheduled_days}</Table.Td>
        </Table.Tr>
        <Table.Tr>
          <Table.Td fw={500}>Learning Steps</Table.Td>
          <Table.Td>{card.learning_steps}</Table.Td>
          <Table.Td fw={500}>Last Review</Table.Td>
          <Table.Td>
            {card.last_review
              ? new Date(card.last_review).toLocaleString()
              : "Never"}
          </Table.Td>
        </Table.Tr>
      </Table.Tbody>
    </Table>
  );
}

function ratingColor(rating: number): string {
  switch (rating) {
    case 1:
      return "red";
    case 2:
      return "orange";
    case 3:
      return "blue";
    case 4:
      return "green";
    default:
      return "gray";
  }
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}
