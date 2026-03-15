import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Menu,
  Paper,
  Popover,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconBolt,
  IconChevronDown,
  IconCircleCheck,
  IconDots,
  IconHelpCircle,
  IconPlus,
  IconWand,
  IconX,
} from "@tabler/icons-react";
import { useCategories } from "../categories/useCategories";
import { useCreateInfoBit } from "../infobits/useCreateInfoBit";
import {
  getSessionCategoryId,
  getSessionTags,
  getStoredSocraticEnabled,
  setSessionCategoryId,
  setSessionTags,
  setSocraticEnabledDefault,
} from "../../lib/session/newPreferences";
import { fetchGeneratedCards, fetchSocraticQuestions } from "../../lib/llm/client";
import type { SocraticAnswer, SocraticQuestion } from "../../lib/llm/types";
import { useGenerationPolicyByCategory } from "../generation/useGenerationPolicyByCategory";
import { useLearningPreferences } from "../generation/useLearningPreferences";
import { useValidateNoteSpec } from "../generation/useValidateNoteSpec";
import { StreakHeatmap } from "../streak/StreakHeatmap";
import { useDailyEngagement } from "../streak/useDailyEngagement";
import { useHealthStatus } from "../system/useHealthStatus";
import {
  FEATURE_MAX_WIDTH,
  getGlassInsetStyle,
  getAiActionStyle,
  getAiInputStyle,
  getDockClearance,
  getInputSurfaceStyle,
  getPrimaryActionStyle,
  getSubtleSectionStyle,
  wrapTextStyle,
} from "../../lib/ui/glass";
import {
  CATEGORY_COLORS,
  buildCategoryChoices,
  getCategorySlugFromKey,
  getDoctrineBySlug,
  getDoctrineDefaults,
  resolveCategoryChoice,
} from "../../lib/llm/categoryDoctrine";
import { toPersistedNoteSpec } from "../../lib/llm/noteSpecPersistence";
import type { NoteSpec } from "../../types";

interface EditableGeneratedCard {
  id: string;
  front: string;
  back: string;
  selected: boolean;
}

interface QuestionAnswerState {
  selectedOption: string;
  typedAnswer: string;
  notImportant: boolean;
}

interface LlmStatus {
  provider: "openai" | "fallback";
  model: string;
  hasApiKey: boolean;
  fallbackEnabled: boolean;
  live: boolean;
}

const DEFAULT_MAX_SOCRATIC_ROUNDS = 2;
const MAX_ALLOWED_SOCRATIC_ROUNDS = 3;

function makeId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSocraticStage(round: number): "context" | "structure" | "disambiguation" {
  if (round <= 1) return "context";
  if (round === 2) return "structure";
  return "disambiguation";
}

function formatSocraticStageLabel(stage: "context" | "structure" | "disambiguation"): string {
  if (stage === "context") return "context";
  if (stage === "structure") return "structure";
  return "disambiguation";
}

interface NewPageProps {
  dueCount?: number;
  isActive?: boolean;
}

export function NewPage({ dueCount = 0, isActive = true }: NewPageProps = {}) {
  const { categories, loading: categoriesLoading } = useCategories();
  const { createInfoBit, loading: creatingInfoBit } = useCreateInfoBit();
  const { preferences, loading: preferencesLoading } = useLearningPreferences();
  const { validateNoteSpec } = useValidateNoteSpec();
  const { health: backendHealth } = useHealthStatus();
  const { colorScheme } = useMantineColorScheme();
  const isCompact = !!useMediaQuery("(max-width: 36em)");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasHydratedDefaults = useRef(false);

  const [inputText, setInputText] = useState("");
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [socraticEnabled, setSocraticEnabled] = useState(true);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const categoryChoices = useMemo(() => buildCategoryChoices(categories), [categories]);
  const selectedCategoryChoice = useMemo(
    () => resolveCategoryChoice(categoryChoices, categoryKey),
    [categoryChoices, categoryKey]
  );
  const selectedCategorySlug = selectedCategoryChoice?.slug ?? "fact";
  const resolvedBackendCategoryId = selectedCategoryChoice?.backendCategoryId ?? null;
  const { policy: categoryGenerationPolicy } = useGenerationPolicyByCategory(
    selectedCategoryChoice?.isVirtual ? null : resolvedBackendCategoryId
  );

  const [questions, setQuestions] = useState<SocraticQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswerState>>({});
  const [moreContext, setMoreContext] = useState("");
  const [socraticRound, setSocraticRound] = useState(0);
  const [allowFollowUpRound, setAllowFollowUpRound] = useState(false);
  const [socraticStage, setSocraticStage] = useState<"context" | "structure" | "disambiguation">(
    "context"
  );
  const [socraticReason, setSocraticReason] = useState<string | null>(null);
  const [generatedCards, setGeneratedCards] = useState<EditableGeneratedCard[]>([]);
  const [generatedNoteSpec, setGeneratedNoteSpec] = useState<NoteSpec | null>(null);
  const [editRequest, setEditRequest] = useState("");

  const [askingQuestions, setAskingQuestions] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const doctrineDefaults = useMemo(
    () => getDoctrineDefaults(selectedCategorySlug),
    [selectedCategorySlug]
  );
  const selectedDoctrine = useMemo(
    () => getDoctrineBySlug(selectedCategorySlug),
    [selectedCategorySlug]
  );
  const activeGenerationConfig = useMemo(
    () => ({
      ...doctrineDefaults,
      ...(selectedCategoryChoice?.isVirtual ? {} : (categoryGenerationPolicy?.config ?? {})),
    }),
    [doctrineDefaults, selectedCategoryChoice?.isVirtual, categoryGenerationPolicy?.config]
  );
  const maxSocraticRounds = useMemo(() => {
    const raw = activeGenerationConfig?.maxSocraticRounds;
    if (!Number.isFinite(raw)) return DEFAULT_MAX_SOCRATIC_ROUNDS;
    return Math.max(1, Math.min(MAX_ALLOWED_SOCRATIC_ROUNDS, Math.floor(Number(raw))));
  }, [activeGenerationConfig?.maxSocraticRounds]);
  const shouldAttemptNoteSpecValidation = backendHealth?.featureFlags?.noteSpecValidator !== false;

  const selectedCategoryColor = CATEGORY_COLORS[selectedCategorySlug] || "indigo";
  const isDark = colorScheme === "dark";
  const primaryActionStyle = getPrimaryActionStyle(isDark);
  const aiActionStyle = getAiActionStyle(isDark);
  const fieldRadius = isCompact ? 18 : 20;
  const editorRadius = isCompact ? 16 : 18;
  const compactControlRadius = isCompact ? 16 : 18;
  const roomyInputStyle = {
    ...getInputSurfaceStyle(isDark),
    borderRadius: fieldRadius,
    minHeight: isCompact ? 52 : 56,
    paddingLeft: isCompact ? 16 : 18,
    paddingRight: isCompact ? 16 : 18,
    fontSize: isCompact ? "0.98rem" : "1rem",
    lineHeight: 1.45,
  };
  const roomyAiInputStyle = {
    ...getAiInputStyle(isDark),
    borderRadius: editorRadius,
    minHeight: isCompact ? 52 : 56,
    paddingLeft: isCompact ? 16 : 18,
    paddingRight: isCompact ? 16 : 18,
    fontSize: isCompact ? "0.98rem" : "1rem",
    lineHeight: 1.45,
  };
  const roomyTextareaStyle = {
    ...getInputSurfaceStyle(isDark),
    borderRadius: editorRadius,
    padding: isCompact ? "14px 16px" : "16px 18px",
    lineHeight: 1.55,
  };
  const roomyAiTextareaStyle = {
    ...getAiInputStyle(isDark),
    borderRadius: editorRadius,
    padding: isCompact ? "14px 16px" : "16px 18px",
    lineHeight: 1.55,
  };
  const compactInputStyle = {
    ...getInputSurfaceStyle(isDark),
    borderRadius: compactControlRadius,
    minHeight: isCompact ? 42 : 44,
    paddingLeft: 14,
    paddingRight: 14,
    fontSize: "0.92rem",
    lineHeight: 1.35,
  };
  const heroSectionStyle = {
    ...getSubtleSectionStyle(isDark),
    position: "relative" as const,
    overflow: "hidden" as const,
    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.86)",
    background: isDark
      ? "linear-gradient(180deg, rgba(24, 27, 33, 0.9), rgba(17, 19, 25, 0.94))"
      : "linear-gradient(180deg, rgba(252, 252, 248, 0.98), rgba(244, 243, 238, 0.96))",
    boxShadow: isDark
      ? "0 26px 68px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(147, 222, 67, 0.04)"
      : "0 26px 58px rgba(92, 100, 123, 0.13), 0 0 0 1px rgba(255,255,255,0.7)",
  };
  const heroInsetStyle = {
    ...getGlassInsetStyle(isDark),
    borderRadius: isCompact ? 24 : 28,
    padding: isCompact ? "0.85rem 0.9rem" : "1rem 1.05rem",
    minHeight: isCompact ? undefined : 152,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    gap: "0.75rem",
  };
  const submitBottomClearance = isCompact
    ? `calc(${getDockClearance(isCompact)} + 6.25rem)`
    : "2rem";
  const { points: dailyEngagement, loading: streakLoading, error: streakError } = useDailyEngagement(90);
  const renderHelpButton = (label: string, hint: string) => (
    <Tooltip
      label={hint}
      withArrow
      multiline
      maw={220}
      position="top-start"
      openDelay={120}
    >
      <ActionIcon
        aria-label={`${label} help`}
        variant="subtle"
        color="gray"
        radius="xl"
        size="sm"
      >
        <IconHelpCircle size={14} />
      </ActionIcon>
    </Tooltip>
  );
  const streakPanel = (
    <div style={heroInsetStyle}>
      <div>
        <Text
          size="10px"
          fw={800}
          tt="uppercase"
          style={{
            letterSpacing: "0.16em",
            color: isDark ? "rgba(210, 218, 199, 0.62)" : "rgba(71, 77, 58, 0.64)",
          }}
        >
          Daily rhythm
        </Text>
        <Text
          fw={650}
          size="sm"
          mt={4}
          style={{ color: isDark ? "#edf2e1" : "#22281b" }}
        >
          Streaks land here soon.
        </Text>
      </div>
      {streakLoading ? (
        <Text size="xs" c="dimmed">
          Loading activity...
        </Text>
      ) : (
        <StreakHeatmap
          points={dailyEngagement}
          isDark={isDark}
          compact={isCompact}
          windowDays={90}
        />
      )}
      {streakError && (
        <Text size="xs" c="dimmed">
          Activity heatmap will appear once the daily engagement API is enabled.
        </Text>
      )}
    </div>
  );
  const categoryTrigger = (
    <Button
      aria-expanded={categoryMenuOpen}
      aria-label={
        selectedCategoryChoice?.label
          ? `Change category. Current category is ${selectedCategoryChoice.label}`
          : "Choose a category"
      }
      variant="light"
      justify="space-between"
      size={isCompact ? "md" : "sm"}
      radius={fieldRadius}
      color={selectedCategoryColor}
      disabled={categoriesLoading || categoryChoices.length === 0}
      onClick={(e) => {
        e.preventDefault();
        setCategoryMenuOpen((v) => !v);
      }}
      fullWidth={isCompact}
      rightSection={
        <IconChevronDown
          size={16}
          style={{
            opacity: 0.72,
            transform: categoryMenuOpen ? "rotate(180deg)" : undefined,
            transition: "transform 160ms ease",
          }}
        />
      }
      styles={{
        root: {
          minHeight: isCompact ? 48 : 42,
          boxShadow: "none",
          paddingInline: isCompact ? 14 : 12,
        },
        inner: {
          justifyContent: "space-between",
          width: "100%",
        },
        label: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: 600,
        },
      }}
    >
      {selectedCategoryChoice?.label ?? "Category"}
    </Button>
  );

  useEffect(() => {
    if (hasHydratedDefaults.current) return;
    if (categoryChoices.length === 0 || preferencesLoading) return;

    const newWordChoice =
      categoryChoices.find((choice) => choice.slug.toLowerCase() === "new-word") ?? null;

    const sessionCategory = getSessionCategoryId();
    const migratedSessionCategorySlug = getCategorySlugFromKey(sessionCategory);
    const migratedSessionCategory =
      migratedSessionCategorySlug
        ? categoryChoices.find(
            (choice) => !choice.isVirtual && choice.slug === migratedSessionCategorySlug
          )?.key ?? null
        : null;
    const validSessionCategory =
      sessionCategory && categoryChoices.some((choice) => choice.key === sessionCategory)
        ? sessionCategory
        : migratedSessionCategory;
    const preferredCategory =
      preferences?.newSessionDefaultCategoryId &&
      categoryChoices.some((choice) => choice.key === preferences.newSessionDefaultCategoryId)
        ? preferences.newSessionDefaultCategoryId
        : null;
    setCategoryKey(
      validSessionCategory ?? preferredCategory ?? newWordChoice?.key ?? categoryChoices[0]!.key
    );

    const storedSocratic = getStoredSocraticEnabled();
    setSocraticEnabled(storedSocratic ?? preferences?.defaultSocraticEnabled ?? true);

    const sessionTags = getSessionTags();
    setTags(sessionTags.length > 0 ? sessionTags : (preferences?.defaultTags ?? []));

    hasHydratedDefaults.current = true;
  }, [categoryChoices, preferences, preferencesLoading]);

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const llmApiUrl = import.meta.env.VITE_LLM_API_URL || "http://localhost:3001";
        const response = await fetch(`${llmApiUrl}/api/llm/status`);
        if (!response.ok) return;
        const data = (await response.json()) as LlmStatus;
        if (!cancelled) setLlmStatus(data);
      } catch {
        // Optional indicator only
      }
    };
    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedDefaults.current) return;
    setSocraticEnabledDefault(socraticEnabled);
  }, [socraticEnabled]);

  useEffect(() => {
    if (socraticEnabled) return;
    setQuestions([]);
    setAnswers({});
    setMoreContext("");
    setSocraticRound(0);
    setAllowFollowUpRound(false);
    setSocraticStage("context");
    setSocraticReason(null);
  }, [socraticEnabled]);

  const qaContext: SocraticAnswer[] = questions
    .map((q) => {
      const state = answers[q.id];
      return {
        questionId: q.id,
        question: q.text,
        selectedOption: state?.selectedOption || undefined,
        typedAnswer: state?.typedAnswer || undefined,
        notImportant: state?.notImportant || undefined,
      };
    })
    .filter((entry) => entry.selectedOption || entry.typedAnswer || entry.notImportant);

  const qaContextWithMoreContext = moreContext.trim()
    ? [
        ...qaContext,
        {
          questionId: "meta-more-context",
          question: "Additional context",
          typedAnswer: moreContext.trim(),
        } satisfies SocraticAnswer,
      ]
    : qaContext;

  const canGenerate = inputText.trim().length > 0 && !categoriesLoading;
  const selectedCardCount = generatedCards.filter(
    (card) => card.selected && card.front.trim() && card.back.trim()
  ).length;
  const canSubmit = !!resolvedBackendCategoryId && selectedCardCount > 0;
  const hasExpandedPanels =
    !!error || (socraticEnabled && questions.length > 0) || generatedCards.length > 0;
  const generationButtonLabel = !socraticEnabled
    ? "generate"
    : socraticRound === 0
      ? "ask context"
      : allowFollowUpRound
        ? `ask ${formatSocraticStageLabel(
            getSocraticStage(Math.min(maxSocraticRounds, socraticRound + 1))
          )}`
        : "generate";

  const updateAnswer = (questionId: string, patch: Partial<QuestionAnswerState>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOption: prev[questionId]?.selectedOption ?? "",
        typedAnswer: prev[questionId]?.typedAnswer ?? "",
        notImportant: prev[questionId]?.notImportant ?? false,
        ...patch,
      },
    }));
  };

  const updateCard = (cardId: string, patch: Partial<EditableGeneratedCard>) => {
    setGeneratedCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, ...patch } : card))
    );
  };

  const requestSocraticQuestions = async (requestedRound: number) => {
    setAskingQuestions(true);
    setError(null);
    try {
      const result = await fetchSocraticQuestions({
        inputText: inputText.trim(),
        categoryName: selectedCategoryChoice?.label ?? "General",
        categorySlug: selectedCategoryChoice?.slug ?? "general",
        categoryKey: selectedCategoryChoice?.key ?? undefined,
        tags,
        qaContext: qaContextWithMoreContext,
        round: requestedRound,
        maxRounds: maxSocraticRounds,
        generationConfig: activeGenerationConfig,
      });
      const normalizedRound = Math.max(1, result.round ?? requestedRound);
      const resolvedStage =
        result.stage && ["context", "structure", "disambiguation"].includes(result.stage)
          ? result.stage
          : getSocraticStage(normalizedRound);
      const normalizedQuestions = (result.questions ?? []).map((question, idx) => ({
        ...question,
        id: `r${normalizedRound}-${question.id || idx + 1}`,
      }));

      setSocraticRound(normalizedRound);
      setSocraticStage(resolvedStage);
      setSocraticReason(result.reason ?? null);
      setAllowFollowUpRound(
        Boolean(result.needsFollowUp) &&
          normalizedRound < maxSocraticRounds &&
          normalizedQuestions.length > 0
      );

      setQuestions((prev) =>
        normalizedRound > 1 ? [...prev, ...normalizedQuestions] : normalizedQuestions
      );

      return {
        round: normalizedRound,
        stage: resolvedStage,
        needsFollowUp: Boolean(result.needsFollowUp),
        questions: normalizedQuestions,
      };
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setAskingQuestions(false);
    }
  };

  const requestGeneratedCards = async (opts?: { editInstruction?: string }) => {
    setGeneratingCards(true);
    setError(null);
    try {
      const result = await fetchGeneratedCards({
        inputText: inputText.trim(),
        categoryName: selectedCategoryChoice?.label ?? "General",
        categorySlug: selectedCategoryChoice?.slug ?? "general",
        categoryKey: selectedCategoryChoice?.key ?? undefined,
        tags,
        socraticEnabled,
        qaContext: qaContextWithMoreContext,
        generationConfig: activeGenerationConfig,
        editInstruction: opts?.editInstruction?.trim() || undefined,
        existingCards:
          generatedCards.length > 0
            ? generatedCards.map((card) => ({ front: card.front, back: card.back }))
            : undefined,
      });

      const cards = (result.cards ?? [])
        .map((card) => ({
          id: makeId("card"),
          front: (card.front ?? "").trim(),
          back: (card.back ?? "").trim(),
          selected: card.selectedByDefault !== false,
        }))
        .filter((card) => card.front || card.back);

      if (Array.isArray(result.coherenceWarnings) && result.coherenceWarnings.length > 0) {
        notifications.show({
          title: "Card coherence warning",
          message: "Some cards may not test exactly the same fact. Consider refining once.",
          color: "yellow",
        });
      }
      if (result.validatorFlags && Object.values(result.validatorFlags).some((flag) => !flag)) {
        notifications.show({
          title: "Strict generation guardrail triggered",
          message:
            "This capture was normalized to one atomic fact. If it still feels overloaded, narrow the input and try again.",
          color: "yellow",
        });
      }

      setAllowFollowUpRound(false);
      setGeneratedNoteSpec(result.noteSpec ?? null);
      setGeneratedCards(
        cards.length > 0
          ? cards
          : [{ id: makeId("card"), front: inputText.trim(), back: inputText.trim(), selected: true }]
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGeneratingCards(false);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    if (!socraticEnabled) {
      await requestGeneratedCards();
      return;
    }

    if (socraticRound === 0) {
      const firstRound = await requestSocraticQuestions(1);
      if (!firstRound) return;
      if (firstRound.questions.length > 0) return;
      await requestGeneratedCards();
      return;
    }

    if (socraticRound > 0 && allowFollowUpRound && socraticRound < maxSocraticRounds) {
      const followUpRound = await requestSocraticQuestions(socraticRound + 1);
      if (!followUpRound) return;
      if (followUpRound.questions.length > 0) return;
    }

    await requestGeneratedCards();
  };

  const handleManualMode = () => {
    setQuestions([]);
    setAnswers({});
    setMoreContext("");
    setSocraticRound(0);
    setAllowFollowUpRound(false);
    setSocraticStage("context");
    setSocraticReason(null);
    setGeneratedNoteSpec(null);
    setGeneratedCards([{ id: makeId("card"), front: "", back: "", selected: true }]);
    notifications.show({
      title: "Manual mode",
      message: "You can now create cards directly.",
          color: "blue",
    });
  };

  const handleRefine = async () => {
    if (!editRequest.trim() || generatedCards.length === 0) return;
    await requestGeneratedCards({ editInstruction: editRequest });
    setEditRequest("");
  };

  const handleSubmit = async () => {
    if (!canSubmit || !resolvedBackendCategoryId) return;
    setError(null);

    const selectedCards = generatedCards
      .filter((card) => card.selected && card.front.trim() && card.back.trim())
      .map((card) => ({
        frontBlocks: [{ type: "text", text: card.front.trim() }],
        backBlocks: [{ type: "text", text: card.back.trim() }],
      }));
    const inferredTitle =
      inputText.trim() ||
      selectedCards[0]?.frontBlocks[0]?.text ||
      generatedCards.find((card) => card.front.trim())?.front.trim() ||
      "Manual cards";
    const inferredOriginalContent = inputText.trim() || inferredTitle;
    const persistedNoteSpec = toPersistedNoteSpec(generatedNoteSpec, {
      categorySlug: selectedCategorySlug,
      memoryArchetype: selectedDoctrine?.memoryArchetype,
    });

    try {
      const createdInfoBit = await createInfoBit({
        title: inferredTitle,
        categoryId: resolvedBackendCategoryId,
        tags: tags.length > 0 ? tags : undefined,
        originalContent: inferredOriginalContent,
        noteSpec: persistedNoteSpec,
        cards: selectedCards,
      });

      if (createdInfoBit?.infoBitId && persistedNoteSpec && shouldAttemptNoteSpecValidation) {
        void (async () => {
          const validation = await validateNoteSpec(createdInfoBit.infoBitId);
          if (!validation || validation.isValid) return;

          const failedChecks = validation.checks
            .filter((check) => !check.passed)
            .map((check) => check.name)
            .slice(0, 3);
          const summary =
            failedChecks.length > 0
              ? `Saved, but validator flagged: ${failedChecks.join(", ")}.`
              : "Saved, but validator flagged structural issues.";
          notifications.show({
            title: "Saved with quality warnings",
            message: summary,
            color: "yellow",
            icon: <IconAlertCircle size={16} />,
          });
        })();
      }

      setSessionCategoryId(categoryKey ?? resolvedBackendCategoryId);
      setSessionTags(tags);
      setSocraticEnabledDefault(socraticEnabled);

      notifications.show({
        title: "Saved",
        message: "Ready for the next one.",
        color: "green",
        icon: <IconCircleCheck size={16} />,
      });

      setInputText("");
      setQuestions([]);
      setAnswers({});
      setMoreContext("");
      setSocraticRound(0);
      setAllowFollowUpRound(false);
      setSocraticStage("context");
      setSocraticReason(null);
      setGeneratedNoteSpec(null);
      setGeneratedCards([]);
      setEditRequest("");
      inputRef.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Stack
      w="100%"
      maw={FEATURE_MAX_WIDTH}
      mx="auto"
      gap="md"
      style={{
        minHeight: `calc(100dvh - ${isCompact ? 210 : 250}px)`,
        justifyContent: isCompact ? (hasExpandedPanels ? "flex-start" : "flex-end") : "center",
        paddingTop: isCompact ? 0 : "clamp(0.5rem, 1.8vh, 1.4rem)",
        paddingBottom: canSubmit ? submitBottomClearance : 0,
      }}
    >
      <Stack gap={isCompact ? "md" : "lg"} h="100%">
        {isCompact && (
          <Paper withBorder p="xs" radius={24} style={getSubtleSectionStyle(isDark)}>
            {streakPanel}
          </Paper>
        )}

        <Paper withBorder p={isCompact ? "md" : "lg"} radius={isCompact ? 30 : 34} style={heroSectionStyle}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: isDark
                ? "radial-gradient(circle at top right, rgba(132, 98, 208, 0.22), transparent 24%), radial-gradient(circle at 18% 16%, rgba(147, 222, 67, 0.12), transparent 18%)"
                : "radial-gradient(circle at top right, rgba(188, 175, 226, 0.46), transparent 26%), radial-gradient(circle at 18% 16%, rgba(151, 223, 79, 0.16), transparent 20%)",
            }}
          />
          <Stack gap={isCompact ? "sm" : "md"}>
            <Group justify="space-between" align="center" wrap="wrap" style={{ position: "relative", zIndex: 1 }}>
              <Group gap="xs" align="center">
                <span
                  aria-hidden="true"
                  style={{
                    width: isCompact ? 20 : 24,
                    height: 4,
                    borderRadius: 999,
                    background: isDark ? "rgba(151, 226, 73, 0.84)" : "rgba(124, 200, 25, 0.9)",
                    display: "inline-block",
                  }}
                />
                <Text
                  size="10px"
                  fw={800}
                  tt="uppercase"
                  style={{
                    letterSpacing: "0.18em",
                    color: isDark ? "rgba(221, 235, 193, 0.82)" : "rgba(74, 116, 21, 0.9)",
                  }}
                >
                  Capture
                </Text>
                <Badge color={dueCount > 0 ? "grape" : "gray"} variant="light" radius="xl">
                  {dueCount > 0 ? `${dueCount} due now` : "clear for now"}
                </Badge>
              </Group>
              {llmStatus && !llmStatus.live && (
                <Badge color="gray" variant="light" radius="xl">
                  Fallback mode
                </Badge>
              )}
            </Group>

            <Group
              align="stretch"
              justify="space-between"
              wrap={isCompact ? "wrap" : "nowrap"}
              gap={isCompact ? "md" : "xl"}
              style={{ position: "relative", zIndex: 1 }}
            >
              <Stack gap={isCompact ? 12 : 16} style={{ flex: 1, minWidth: 0, maxWidth: isCompact ? undefined : 620 }}>
                <Stack gap={isCompact ? 8 : 10}>
                  <Text
                    size={isCompact ? "xs" : "sm"}
                    fw={700}
                    tt="uppercase"
                    style={{
                      letterSpacing: "0.12em",
                      color: isDark ? "rgba(151, 226, 73, 0.88)" : "rgba(94, 148, 22, 0.9)",
                    }}
                  >
                    capture without planning
                  </Text>
                  <Text
                    component="h1"
                    fw={760}
                    lh={0.94}
                    m={0}
                    style={{
                      fontSize: isCompact ? "2.2rem" : "clamp(3rem, 4.8vw, 4.6rem)",
                      letterSpacing: "-0.045em",
                      maxWidth: isCompact ? undefined : "11ch",
                      color: isDark ? "#f2f5ea" : "#191d14",
                    }}
                  >
                    drop in what you just learned
                  </Text>
                  <Text
                    size={isCompact ? "sm" : "md"}
                    style={{
                      maxWidth: isCompact ? undefined : 500,
                      lineHeight: 1.5,
                      color: isDark ? "rgba(228, 233, 217, 0.78)" : "rgba(54, 61, 41, 0.78)",
                    }}
                  >
                    One word, one copied line, or one short fact is enough. Sticky shapes the
                    cards, asks when context is missing, and brings it back when it matters.
                  </Text>
                </Stack>

                <Group
                  align="stretch"
                  wrap={isCompact ? "wrap" : "nowrap"}
                  gap="sm"
                >
                  <TextInput
                    aria-label="What did you learn?"
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.currentTarget.value)}
                    placeholder="word, fact, concept..."
                    size={isCompact ? "md" : "lg"}
                    radius={fieldRadius}
                    style={{ flex: 1, minWidth: 0 }}
                    styles={{
                      input: {
                        ...roomyInputStyle,
                        minHeight: isCompact ? 58 : 74,
                        fontSize: isCompact ? "1rem" : "1.14rem",
                        fontWeight: 600,
                        paddingLeft: isCompact ? 16 : 22,
                        paddingRight: isCompact ? 16 : 22,
                      },
                    }}
                  />
                  <Popover
                    opened={categoryMenuOpen}
                    onChange={setCategoryMenuOpen}
                    position={isCompact ? "bottom-start" : "bottom-end"}
                    width={isCompact ? "target" : undefined}
                    withArrow
                    shadow="md"
                    radius="lg"
                  >
                    <Popover.Target>
                      <div style={{ width: isCompact ? "100%" : 190 }}>{categoryTrigger}</div>
                    </Popover.Target>
                    <Popover.Dropdown p="xs">
                      {isCompact ? (
                        <Stack gap="xs">
                          {categoryChoices.map((category) => (
                            <Button
                              key={category.key}
                              justify="space-between"
                              radius="lg"
                              color={CATEGORY_COLORS[category.slug] || "indigo"}
                              variant={categoryKey === category.key ? "outline" : "light"}
                              onClick={() => {
                                setCategoryKey(category.key);
                                setCategoryMenuOpen(false);
                              }}
                            >
                              {category.label}
                            </Button>
                          ))}
                        </Stack>
                      ) : (
                        <Group gap="xs">
                          {categoryChoices.map((category) => (
                            <Button
                              key={category.key}
                              size="xs"
                              radius="lg"
                              color={CATEGORY_COLORS[category.slug] || "indigo"}
                              variant={categoryKey === category.key ? "outline" : "light"}
                              onClick={() => {
                                setCategoryKey(category.key);
                                setCategoryMenuOpen(false);
                              }}
                            >
                              {category.label}
                            </Button>
                          ))}
                        </Group>
                      )}
                    </Popover.Dropdown>
                  </Popover>
                </Group>
              </Stack>

              {!isCompact && <div style={{ width: 228, flexShrink: 0 }}>{streakPanel}</div>}
            </Group>

            {selectedCategoryChoice?.isVirtual && (
              <Text size="xs" c="dimmed" style={wrapTextStyle}>
                This category is frontend-first and currently saves under{" "}
                {selectedCategoryChoice.backendSlug ?? "a compatible backend category"} for
                compatibility.
              </Text>
            )}

            {isCompact ? (
              <Stack gap="sm">
                <Stack gap={6}>
                  <Group gap={4} align="center">
                    <Text size="xs" fw={600} c="dimmed">
                      tags
                    </Text>
                    {renderHelpButton("Tags", "Optional. Use tags to organize related captures.")}
                  </Group>
                  <TagsInput
                    aria-label="Tags"
                    placeholder="tags..."
                    value={tags}
                    onChange={setTags}
                    radius={compactControlRadius}
                    size="sm"
                    w="100%"
                    styles={{
                      input: compactInputStyle,
                    }}
                  />
                </Stack>
                <Stack gap={6}>
                  <Group gap={4} align="center">
                    <Text size="xs" fw={600} c="dimmed">
                      socratic
                    </Text>
                    {renderHelpButton(
                      "Socratic",
                      "Optional. When on, Sticky asks for missing detail instead of guessing."
                    )}
                  </Group>
                  <Switch
                    checked={socraticEnabled}
                    onChange={(e) => setSocraticEnabled(e.currentTarget.checked)}
                    aria-label="Use Socratic follow-up questions before generating cards"
                    color="grape"
                    size="md"
                    style={{ width: "100%" }}
                  />
                </Stack>
              </Stack>
            ) : (
              <Group align="flex-start" justify="space-between" wrap="nowrap" gap="md">
                <Stack gap={6} style={{ width: 220, flexShrink: 0 }}>
                  <Group gap={4} align="center">
                    <Text size="xs" fw={600} c="dimmed">
                      tags
                    </Text>
                    {renderHelpButton("Tags", "Optional. Use tags to organize related captures.")}
                  </Group>
                  <TagsInput
                    aria-label="Tags"
                    placeholder="tags..."
                    value={tags}
                    onChange={setTags}
                    style={{ width: "100%" }}
                    radius={compactControlRadius}
                    size="sm"
                    styles={{
                      input: compactInputStyle,
                    }}
                  />
                </Stack>
                <Stack gap={6} style={{ minWidth: 160, marginLeft: "auto" }}>
                  <Group gap={4} align="center">
                    <Text size="xs" fw={600} c="dimmed">
                      socratic
                    </Text>
                    {renderHelpButton(
                      "Socratic",
                      "Optional. When on, Sticky asks for missing detail instead of guessing."
                    )}
                  </Group>
                  <Switch
                    checked={socraticEnabled}
                    onChange={(e) => setSocraticEnabled(e.currentTarget.checked)}
                    aria-label="Use Socratic follow-up questions before generating cards"
                    color="grape"
                    size="md"
                  />
                </Stack>
              </Group>
            )}

            <Group justify="space-between" align="stretch" wrap="nowrap" gap="sm">
              <Button
                leftSection={<IconWand size={16} color={isDark ? "#b89df4" : "#7857c7"} />}
                radius="xl"
                onClick={handleGenerate}
                loading={askingQuestions || generatingCards}
                disabled={!canGenerate}
                style={{
                  ...aiActionStyle,
                  flex: 1,
                }}
              >
                {generationButtonLabel}
              </Button>

              <Menu position="bottom-end" shadow="md" radius="lg">
                <Menu.Target>
                  <ActionIcon
                    aria-label="Open generation options"
                    variant="subtle"
                    size="lg"
                    radius="xl"
                  >
                    <IconDots size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconPlus size={14} />} onClick={handleManualMode}>
                    manual cards
                  </Menu.Item>
                  {generatedCards.length > 0 && (
                    <Menu.Item
                      leftSection={<IconX size={14} />}
                      color="red"
                      onClick={() => setGeneratedCards([])}
                    >
                      clear generated
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Stack>
        </Paper>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="light"
            radius="lg"
            role="alert"
          >
            {error}
          </Alert>
        )}

        {socraticEnabled && questions.length > 0 && (
          <Paper withBorder p="sm" radius="xl" style={getSubtleSectionStyle(isDark)}>
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Badge variant="light" radius="xl">
                  Socratic round {Math.max(1, socraticRound)} · {formatSocraticStageLabel(socraticStage)}
                </Badge>
                {socraticReason && (
                  <Text size="xs" c="dimmed" style={wrapTextStyle}>
                    {socraticReason}
                  </Text>
                )}
              </Group>
              {questions.map((question, idx) => (
                <Paper
                  key={question.id}
                  withBorder
                  p={isCompact ? "sm" : "md"}
                  radius="md"
                  style={getSubtleSectionStyle(isDark)}
                >
                  <Stack gap="xs">
                    {(() => {
                      const state = answers[question.id];
                      const notImportant = Boolean(state?.notImportant);
                      return (
                        <>
                          <Text
                            id={`${question.id}-label`}
                            size="sm"
                            fw={600}
                            style={wrapTextStyle}
                          >
                            {idx + 1}. {question.text}
                          </Text>
                          {question.options && question.options.length > 0 && (
                            <Group gap={6} wrap="wrap">
                              {question.options.map((option) => {
                                const active = state?.selectedOption === option;
                                return (
                                  <Button
                                    key={option}
                                    size="xs"
                                    radius="xl"
                                    variant={active ? "filled" : "light"}
                                    color={active ? "grape" : undefined}
                                    disabled={notImportant}
                                    onClick={() =>
                                      updateAnswer(question.id, {
                                        selectedOption: active ? "" : option,
                                      })
                                    }
                                  >
                                    {option}
                                  </Button>
                                );
                              })}
                            </Group>
                          )}
                          <TextInput
                            aria-labelledby={`${question.id}-label`}
                            placeholder="or type your answer..."
                            value={state?.typedAnswer ?? ""}
                            disabled={notImportant}
                            radius={editorRadius}
                            size="md"
                            styles={{
                              input: roomyTextareaStyle,
                            }}
                            onChange={(e) =>
                              updateAnswer(question.id, {
                                typedAnswer: e.currentTarget.value,
                              })
                            }
                          />
                          <Checkbox
                            size="xs"
                            label="this is not important for this fact"
                            checked={notImportant}
                            color="green"
                            onChange={(e) => {
                              const checked = e.currentTarget.checked;
                              updateAnswer(question.id, {
                                notImportant: checked,
                                selectedOption: checked ? "" : state?.selectedOption ?? "",
                                typedAnswer: checked ? "" : state?.typedAnswer ?? "",
                              });
                            }}
                          />
                        </>
                      );
                    })()}
                  </Stack>
                </Paper>
              ))}
              <Paper withBorder p={isCompact ? "sm" : "md"} radius="md" style={getSubtleSectionStyle(isDark)}>
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    more context (optional)
                  </Text>
                  <Textarea
                    aria-label="More context"
                    placeholder="add any context you want the AI to consider..."
                    value={moreContext}
                    onChange={(e) => setMoreContext(e.currentTarget.value)}
                    radius={editorRadius}
                    minRows={isCompact ? 4 : 5}
                    styles={{
                      input: roomyAiTextareaStyle,
                    }}
                  />
                </Stack>
              </Paper>
              <Group justify="flex-end">
                <Button
                  leftSection={<IconBolt size={16} color={isDark ? "#b89df4" : "#7857c7"} />}
                  radius="xl"
                  style={aiActionStyle}
                  onClick={handleGenerate}
                  loading={askingQuestions || generatingCards}
                  disabled={!canGenerate}
                  fullWidth={isCompact}
                >
                  {allowFollowUpRound && socraticRound < maxSocraticRounds
                    ? `continue · ${formatSocraticStageLabel(getSocraticStage(socraticRound + 1))}`
                    : "generate from answers"}
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {generatedCards.length > 0 && (
          <Stack gap="sm">
            <Paper withBorder p={isCompact ? "sm" : "md"} radius="xl" style={getSubtleSectionStyle(isDark)}>
              <Stack gap="sm">
                <Text size="sm" fw={600}>
                  let AI edit the cards
                </Text>
                <Group wrap={isCompact ? "wrap" : "nowrap"}>
                  <TextInput
                    aria-label="Ask AI to improve these cards"
                    value={editRequest}
                    onChange={(e) => setEditRequest(e.currentTarget.value)}
                    placeholder="ask AI to improve these cards..."
                    style={{ flex: 1, minWidth: 0 }}
                    radius={editorRadius}
                    size="md"
                    styles={{
                      input: roomyAiInputStyle,
                    }}
                  />
                  <Button
                    radius="xl"
                    variant="light"
                    leftSection={<IconWand size={16} color={isDark ? "#b89df4" : "#7857c7"} />}
                    onClick={handleRefine}
                    loading={generatingCards}
                    disabled={!editRequest.trim()}
                    fullWidth={isCompact}
                    style={aiActionStyle}
                  >
                    apply
                  </Button>
                </Group>
              </Stack>
            </Paper>

            {generatedCards.map((card, idx) => (
              <Paper
                key={card.id}
                withBorder
                p={isCompact ? "sm" : "md"}
                radius="md"
                style={getSubtleSectionStyle(isDark)}
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Checkbox
                      checked={card.selected}
                      color="green"
                      onChange={(e) =>
                        updateCard(card.id, { selected: e.currentTarget.checked })
                      }
                      label={`card ${idx + 1}`}
                    />
                    <ActionIcon
                      aria-label={`Remove card ${idx + 1}`}
                      color="red"
                      variant="subtle"
                      onClick={() =>
                        setGeneratedCards((prev) =>
                          prev.filter((existing) => existing.id !== card.id)
                        )
                      }
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                  <Textarea
                    aria-label={`Front of card ${idx + 1}`}
                    value={card.front}
                    onChange={(e) => updateCard(card.id, { front: e.currentTarget.value })}
                    placeholder="front"
                    radius={editorRadius}
                    autosize
                    minRows={isCompact ? 4 : 5}
                    maxRows={12}
                    styles={{
                      input: roomyTextareaStyle,
                    }}
                  />
                  <Textarea
                    aria-label={`Back of card ${idx + 1}`}
                    value={card.back}
                    onChange={(e) => updateCard(card.id, { back: e.currentTarget.value })}
                    placeholder="back"
                    radius={editorRadius}
                    autosize
                    minRows={isCompact ? 4 : 5}
                    maxRows={12}
                    styles={{
                      input: roomyTextareaStyle,
                    }}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {canSubmit && isActive && (
          <div
            style={{
              position: isCompact ? "sticky" : "static",
              bottom: isCompact ? getDockClearance(isCompact) : undefined,
              zIndex: 4,
              paddingTop: isCompact ? 8 : 4,
            }}
          >
            <Group justify="center" px={isCompact ? "xs" : "md"}>
              <Button
                radius="xl"
                size={isCompact ? "md" : "lg"}
                loading={creatingInfoBit}
                onClick={handleSubmit}
                fullWidth={isCompact}
                style={{
                  ...primaryActionStyle,
                  minWidth: isCompact ? 220 : 260,
                  maxWidth: isCompact ? FEATURE_MAX_WIDTH : undefined,
                }}
              >
                submit selected ({selectedCardCount})
              </Button>
            </Group>
          </div>
        )}
      </Stack>
    </Stack>
  );
}
