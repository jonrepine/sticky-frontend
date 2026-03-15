import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconAlertCircle, IconCheck, IconFlag } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useDueInfoBits, type DueInfoBitsState } from "./useDueInfoBits";
import { useReviewSession } from "./useReviewSession";
import { useFlags } from "../flags/useFlags";
import { BlockContent } from "../../components/BlockContent";
import type { FsrsRating, RatingPreview, ReviewOutcome } from "../../types";
import {
  FEATURE_MAX_WIDTH,
  getDockClearance,
  getPrimaryActionStyle,
  getSubtleSectionStyle,
  wrapTextStyle,
} from "../../lib/ui/glass";

const RATING_CONFIG: {
  rating: FsrsRating;
  label: string;
  color: string;
  description: string;
  fallbackEstimate: string;
}[] = [
  {
    rating: "AGAIN",
    label: "Again",
    color: "red",
    description: "Forgot",
    fallbackEstimate: "est. 5-15 min",
  },
  {
    rating: "HARD",
    label: "Hard",
    color: "orange",
    description: "Struggled",
    fallbackEstimate: "est. later today",
  },
  {
    rating: "GOOD",
    label: "Good",
    color: "blue",
    description: "Recalled",
    fallbackEstimate: "est. in days",
  },
  {
    rating: "EASY",
    label: "Easy",
    color: "green",
    description: "Effortless",
    fallbackEstimate: "est. longer interval",
  },
];

function formatRelativeDue(nextDueAt: string): string {
  const diffMs = new Date(nextDueAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return "next due";

  const absMs = Math.abs(diffMs);
  if (absMs < 60_000) return "now";

  const mins = Math.round(absMs / 60_000);
  if (mins < 60) return diffMs >= 0 ? `in ${mins}m` : `${mins}m ago`;

  const hours = Math.round(absMs / 3_600_000);
  if (hours < 48) return diffMs >= 0 ? `in ${hours}h` : `${hours}h ago`;

  const days = Math.round(absMs / 86_400_000);
  return diffMs >= 0 ? `in ${days}d` : `${days}d ago`;
}

function formatPreviewLabel(preview: RatingPreview | undefined, fallback: string): string {
  if (!preview) return fallback;
  const relative = formatRelativeDue(preview.nextDueAt);
  const when = new Date(preview.nextDueAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${relative} • ${when}`;
}

function formatOutcomePreviewLabel(outcome: ReviewOutcome | undefined): string | null {
  if (!outcome) return null;
  const text = outcome.displayText?.trim();
  if (text) return text;
  if (Number.isFinite(outcome.scheduledSeconds)) {
    const seconds = Math.max(0, Math.floor(outcome.scheduledSeconds));
    if (seconds < 60) return "Next review very soon";
    if (seconds < 3600) return `Next review in ${Math.ceil(seconds / 60)} min`;
    if (seconds < 172800) return `Next review in ${Math.ceil(seconds / 3600)} hr`;
    const days = Math.ceil(seconds / 86400);
    return `Next review in ${days} day${days === 1 ? "" : "s"}`;
  }
  return null;
}

interface StudySessionProps {
  mode: "learn" | "review";
  dueState?: DueInfoBitsState;
}

interface StudySessionContentProps {
  mode: "learn" | "review";
  dueState: DueInfoBitsState;
}

function StudySessionWithQuery({ mode }: { mode: "learn" | "review" }) {
  const queriedDueState = useDueInfoBits(mode === "learn" ? "LEARN" : "REVIEW");
  return <StudySessionContent mode={mode} dueState={queriedDueState} />;
}

function StudySessionContent({ mode, dueState }: StudySessionContentProps) {
  const navigate = useNavigate();
  const {
    dueInfoBits,
    loading: dueLoading,
    error,
    stateAwareQueueUnavailable,
  } = dueState;
  const session = useReviewSession();
  const { createFlag } = useFlags();
  const { colorScheme } = useMantineColorScheme();
  const [started, setStarted] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const isDark = colorScheme === "dark";
  const isCompact = !!useMediaQuery("(max-width: 36em)");
  const primaryActionStyle = getPrimaryActionStyle(isDark);
  const legacyPreviewByRating = useMemo(() => {
    const previews = session.prompt?.ratingPreviews ?? [];
    return new Map(previews.map((preview) => [preview.rating, preview]));
  }, [session.prompt?.ratingPreviews]);
  const outcomePreviewByRating = useMemo(
    () => new Map((session.outcomePreviews ?? []).map((preview) => [preview.rating, preview])),
    [session.outcomePreviews]
  );

  useEffect(() => {
    if (!started && dueInfoBits.length > 0) {
      session.startSession(dueInfoBits);
      setStarted(true);
    }
  }, [dueInfoBits, started, session]);

  if (dueLoading && dueInfoBits.length === 0) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle />} color="red" role="alert">
        {stateAwareQueueUnavailable
          ? "Learn/Review separation requires the backend dueQueue API with FSRS state fields. Enable the backend V2 queue endpoint to continue."
          : error.message}
      </Alert>
    );
  }

  if (dueInfoBits.length === 0 || session.completed) {
    return (
      <Stack
        align="center"
        justify={isCompact ? "flex-end" : "center"}
        gap="md"
        style={{
          minHeight: `calc(100dvh - ${isCompact ? 210 : 250}px)`,
          paddingBottom: isCompact ? getDockClearance(isCompact) : 0,
        }}
      >
        <Stack align="center" gap="md" py={isCompact ? 0 : 80}>
          <ThemeIcon size={64} radius="xl" variant="light" color="brand">
            <IconCheck size={30} />
          </ThemeIcon>
          <Text fw={700} size="lg">
            All caught up
          </Text>
          <Text c="dimmed" size="sm">
            No items due for {mode === "learn" ? "learning" : "review"} right now.
          </Text>
          <Group>
            <Button variant="light" onClick={() => navigate("/new")}>
              Add New Item
            </Button>
            <Button variant="light" onClick={() => navigate("/my-cards")}>
              My Cards
            </Button>
          </Group>
        </Stack>
      </Stack>
    );
  }

  if (!session.prompt) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  const progress =
    session.totalCount > 0
      ? ((session.currentIndex + 1) / session.totalCount) * 100
      : 0;

  return (
    <Stack
      gap="md"
      maw={FEATURE_MAX_WIDTH}
      mx="auto"
      style={{
        minHeight: `calc(100dvh - ${isCompact ? 210 : 250}px)`,
        justifyContent: isCompact ? "flex-end" : "center",
      }}
    >
      <Paper p="sm" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Text fw={700} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.6 }}>
              {mode === "learn" ? "learn" : "review"}
            </Text>
            <Text fw={600} size="sm" c="dimmed" style={wrapTextStyle}>
              {session.revealed ? "Answer revealed" : "Front side"}
            </Text>
          </Stack>
          <Badge variant="light" size="md" radius="xl">
            {session.currentIndex + 1} / {session.totalCount}
          </Badge>
        </Group>
      </Paper>

      <Progress value={progress} size="xs" color="brand" animated radius="xl" />

      <Stack gap="md" align="stretch" justify="center">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: isCompact ? "14px 0 8px" : "18px 0 10px",
            minHeight: isCompact ? 180 : 220,
          }}
        >
          <BlockContent blocks={session.prompt.card.frontBlocks} />
        </div>

        {session.revealed && (
          <Paper
            withBorder
            p="md"
            radius="xl"
            w="100%"
            style={getSubtleSectionStyle(isDark)}
          >
            <BlockContent blocks={session.prompt.card.backBlocks} />
          </Paper>
        )}

        <div
          style={{
            position: isCompact && !session.revealed ? "sticky" : "static",
            bottom: isCompact && !session.revealed ? getDockClearance(isCompact) : undefined,
            zIndex: 4,
            paddingTop: isCompact ? 8 : 4,
          }}
        >
          {session.revealed ? (
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" w="100%">
                {RATING_CONFIG.map((r) => (
                  <Button
                    key={r.rating}
                    color={r.color}
                    variant="light"
                    size="sm"
                    radius="xl"
                    fullWidth
                    style={{
                      ...getSubtleSectionStyle(isDark),
                      minHeight: 80,
                    }}
                    onClick={() => session.submitRating(r.rating)}
                  >
                    <Stack gap={2} align="center">
                      <Text size="sm" fw={600}>
                        {r.label}
                      </Text>
                      <Text size="xs" opacity={0.8}>
                        {r.description}
                      </Text>
                      <Text size="10px" opacity={0.7}>
                        {formatOutcomePreviewLabel(outcomePreviewByRating.get(r.rating)) ??
                          formatPreviewLabel(legacyPreviewByRating.get(r.rating), r.fallbackEstimate)}
                      </Text>
                    </Stack>
                  </Button>
                ))}
              </SimpleGrid>

              <Button
                variant="light"
                color="green"
                size="xs"
                leftSection={<IconFlag size={14} />}
                loading={flagging}
                onClick={async () => {
                  setFlagging(true);
                  await createFlag({
                    entityType: "CARD",
                    entityId: session.prompt!.card.cardId,
                    flagType: "NEEDS_EDIT",
                  });
                  setFlagging(false);
                }}
                fullWidth={isCompact}
              >
                Flag card for edit review
              </Button>
            </Stack>
          ) : (
            <Button
              size="md"
              radius="xl"
              style={primaryActionStyle}
              onClick={session.reveal}
              fullWidth={isCompact}
            >
              Show Answer
            </Button>
          )}
        </div>
      </Stack>
    </Stack>
  );
}

export function StudySession({ mode, dueState }: StudySessionProps) {
  if (dueState) {
    return <StudySessionContent mode={mode} dueState={dueState} />;
  }

  return <StudySessionWithQuery mode={mode} />;
}
