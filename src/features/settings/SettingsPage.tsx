import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Group,
  MultiSelect,
  Paper,
  Select,
  Stack,
  TagsInput,
  Text,
  Textarea,
  Title,
  TextInput,
  useMantineColorScheme,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconTrash } from "@tabler/icons-react";
import { useMutation } from "@apollo/client";
import { useAuth } from "../../lib/auth/AuthContext";
import { UPDATE_ME } from "../auth/graphql";
import { notifications } from "@mantine/notifications";
import { useCategories } from "../categories/useCategories";
import { useGenerationPolicyByCategory } from "../generation/useGenerationPolicyByCategory";
import { useGenerationPolicyMutations } from "../generation/useGenerationPolicyMutations";
import { useLearningPreferences } from "../generation/useLearningPreferences";
import type { GenerationCardStyle } from "../../types";
import {
  getGlassInsetStyle,
  getInputSurfaceStyle,
  getPrimaryActionStyle,
  getSubtleSectionStyle,
} from "../../lib/ui/glass";
import {
  buildCategoryChoices,
  getDoctrineBySlug,
  getDoctrineDefaults,
  resolveCategoryChoice,
} from "../../lib/llm/categoryDoctrine";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const CARD_STYLE_OPTIONS: Array<{ value: GenerationCardStyle; label: string }> = [
  { value: "direct_qa", label: "Direct Q&A" },
  { value: "cloze_contextual", label: "Contextual cloze" },
  { value: "reverse_qa", label: "Reverse Q&A" },
  { value: "example_usage", label: "Example usage" },
  { value: "analogy", label: "Analogy" },
  { value: "mnemonic", label: "Mnemonic" },
  { value: "scenario", label: "Scenario" },
  { value: "definition_to_word", label: "Definition -> word" },
  { value: "association_to_word", label: "Association cue -> word" },
  { value: "correction_or_application", label: "Correction/application" },
  { value: "concept_to_term", label: "Concept -> term" },
  { value: "contrast_to_term", label: "Contrast cue -> term" },
  { value: "exact_recitation", label: "Exact recitation" },
  { value: "scenario_to_principle", label: "Scenario -> principle" },
  { value: "source_to_principle", label: "Source -> principle" },
  { value: "application_to_principle", label: "Application -> principle" },
  { value: "cue_to_recitation", label: "Cue -> recitation" },
  { value: "phrase_completion", label: "Phrase completion" },
  { value: "contrast_discrimination", label: "Contrast discrimination" },
  { value: "scenario_to_target", label: "Scenario -> target term" },
  { value: "correction_prompt", label: "Correction prompt" },
  { value: "direct_formula", label: "Direct formula recall" },
  { value: "formula_completion", label: "Formula completion" },
  { value: "application_prompt", label: "Application prompt" },
  { value: "cue_to_sequence", label: "Cue -> sequence" },
  { value: "next_step", label: "Next step" },
  { value: "procedure_cloze", label: "Procedure cloze" },
];

const CARD_STYLE_SET = new Set<GenerationCardStyle>(CARD_STYLE_OPTIONS.map((s) => s.value));

const CREATIVITY_BLURBS: Record<string, { label: string; blurb: string }> = {
  "1": {
    label: "Literal",
    blurb: "Very close to source wording. Lowest variation and safest phrasing.",
  },
  "2": {
    label: "Balanced",
    blurb: "Moderate wording variation while staying close to source meaning.",
  },
  "3": {
    label: "Expressive",
    blurb: "More varied prompt styles and rephrasing without changing the core fact.",
  },
  "4": {
    label: "Exploratory",
    blurb: "Highest variation. Best for diverse retrieval angles with higher drift risk.",
  },
};

const STRICTNESS_BLURBS: Record<string, { label: string; blurb: string }> = {
  "1": {
    label: "Anchor-locked",
    blurb: "Cards stay tightly tied to the same fact. Minimal deviation allowed.",
  },
  "2": {
    label: "Tight",
    blurb: "Small paraphrase flexibility while preserving one core memory target.",
  },
  "3": {
    label: "Flexible",
    blurb: "Allows moderate contextual framing while keeping factual scope mostly stable.",
  },
  "4": {
    label: "Broad",
    blurb: "Allows wider reframing. More creative but higher chance of factual drift.",
  },
};

const NEW_WORD_PLUS_TEMPLATE =
  "Ask first where I heard/read this and in what context. Then generate cards that test the same phrase meaning and context recall (speaker/source, scene, and wording) without drifting into unrelated facts.";

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return Math.min(max, Math.max(min, normalized));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeCardStyles(value: unknown): GenerationCardStyle[] {
  return toStringArray(value).filter(
    (item): item is GenerationCardStyle => CARD_STYLE_SET.has(item as GenerationCardStyle)
  );
}

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { categories } = useCategories();
  const {
    preferences,
    loading: preferencesLoading,
    saving: preferencesSaving,
    error: preferencesError,
    updatePreferences,
  } = useLearningPreferences();
  const { upsertGenerationPolicy, removeGenerationPolicy, upserting, removing, error: policyWriteError } =
    useGenerationPolicyMutations();

  const [username, setUsername] = useState(user?.username ?? "");
  const [timezone, setTimezone] = useState(
    user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null);
  const [defaultSocraticEnabled, setDefaultSocraticEnabled] = useState(true);
  const [defaultTags, setDefaultTags] = useState<string[]>([]);
  const [policyCategoryKey, setPolicyCategoryKey] = useState<string | null>(null);
  const [targetCardCount, setTargetCardCount] = useState("3");
  const [creativityLevel, setCreativityLevel] = useState("2");
  const [deviationAllowance, setDeviationAllowance] = useState("1");
  const [maxSocraticRounds, setMaxSocraticRounds] = useState("1");
  const [includeClozeCard, setIncludeClozeCard] = useState(true);
  const [requiredCardStyles, setRequiredCardStyles] = useState<GenerationCardStyle[]>([
    "direct_qa",
    "cloze_contextual",
  ]);
  const [sourcePreference, setSourcePreference] = useState<string[]>([]);
  const [policySocraticDefault, setPolicySocraticDefault] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");

  const [updateMe, { loading, error }] = useMutation(UPDATE_ME);
  const categoryChoices = useMemo(() => buildCategoryChoices(categories), [categories]);
  const selectedPolicyChoice = useMemo(
    () => resolveCategoryChoice(categoryChoices, policyCategoryKey),
    [categoryChoices, policyCategoryKey]
  );
  const policyCategoryId = selectedPolicyChoice?.backendCategoryId ?? null;
  const {
    policy: categoryPolicy,
    loading: categoryPolicyLoading,
    error: categoryPolicyError,
    refetchPolicy,
  } = useGenerationPolicyByCategory(policyCategoryId);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.categoryId,
        label: category.name,
      })),
    [categories]
  );
  const policyCategoryOptions = useMemo(
    () =>
      categoryChoices.map((choice) => ({
        value: choice.key,
        label: choice.isVirtual ? `${choice.label} (virtual)` : choice.label,
      })),
    [categoryChoices]
  );
  const selectedDoctrine = useMemo(
    () => getDoctrineBySlug(selectedPolicyChoice?.slug ?? null),
    [selectedPolicyChoice?.slug]
  );

  useEffect(() => {
    if (user) {
      setUsername(user.username ?? "");
      setTimezone(user.timezone);
    }
  }, [user]);

  useEffect(() => {
    if (!policyCategoryKey && categoryChoices.length > 0) {
      setPolicyCategoryKey(categoryChoices[0]!.key);
    }
  }, [categoryChoices, policyCategoryKey]);

  useEffect(() => {
    if (!preferences) return;
    setDefaultCategoryId(preferences.newSessionDefaultCategoryId ?? null);
    setDefaultSocraticEnabled(preferences.defaultSocraticEnabled);
    setDefaultTags(preferences.defaultTags ?? []);
  }, [preferences]);

  useEffect(() => {
    if (categoryPolicyLoading) return;
    const doctrineDefaults = getDoctrineDefaults(selectedPolicyChoice?.slug ?? "fact");
    const config = categoryPolicy?.config ?? doctrineDefaults;

    setTargetCardCount(
      String(clampInt(config.targetCardCount, doctrineDefaults.targetCardCount ?? 3, 1, 8))
    );
    setCreativityLevel(
      String(clampInt(config.creativityLevel, doctrineDefaults.creativityLevel ?? 2, 1, 4))
    );
    setDeviationAllowance(
      String(clampInt(config.deviationAllowance, doctrineDefaults.deviationAllowance ?? 1, 1, 4))
    );
    setMaxSocraticRounds(
      String(clampInt(config.maxSocraticRounds, doctrineDefaults.maxSocraticRounds ?? 2, 1, 3))
    );
    setIncludeClozeCard(
      typeof config.includeClozeCard === "boolean"
        ? config.includeClozeCard
        : Boolean(doctrineDefaults.includeClozeCard ?? true)
    );
    const styles = normalizeCardStyles(config.requiredCardStyles);
    setRequiredCardStyles(
      styles.length > 0
        ? styles
        : normalizeCardStyles(doctrineDefaults.requiredCardStyles).length > 0
          ? normalizeCardStyles(doctrineDefaults.requiredCardStyles)
          : ["direct_qa", "cloze_contextual"]
    );
    setSourcePreference(toStringArray(config.sourcePreference));
    setPolicySocraticDefault(
      typeof config.socraticModeDefault === "boolean"
        ? config.socraticModeDefault
        : Boolean(doctrineDefaults.socraticModeDefault ?? true)
    );
    setCustomInstructions(
      typeof config.customInstructions === "string" ? config.customInstructions : ""
    );
  }, [categoryPolicy, categoryPolicyLoading, selectedPolicyChoice?.slug]);

  useEffect(() => {
    if (includeClozeCard) return;
    setRequiredCardStyles((prev) => prev.filter((style) => style !== "cloze_contextual"));
  }, [includeClozeCard]);

  const handleSaveProfile = async () => {
    const { data } = await updateMe({
      variables: {
        input: {
          username: username || null,
          timezone,
        },
      },
    });
    if (data?.updateMe) {
      updateUser({ ...user!, ...data.updateMe });
      notifications.show({
        title: "Settings saved",
        message: "Your profile has been updated",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    }
  };

  const handleSaveLearningPreferences = async () => {
    const updated = await updatePreferences({
      newSessionDefaultCategoryId: defaultCategoryId || null,
      defaultSocraticEnabled,
      defaultTags,
    });
    if (!updated) return;
    notifications.show({
      title: "Learning defaults saved",
      message: "New-session defaults were updated.",
      color: "green",
      icon: <IconCheck size={16} />,
    });
  };

  const handleSaveCategoryPolicy = async () => {
    if (!policyCategoryId || selectedPolicyChoice?.isVirtual) return;
    const saved = await upsertGenerationPolicy({
      scope: "CATEGORY",
      categoryId: policyCategoryId,
      config: {
        targetCardCount: clampInt(targetCardCount, 3, 1, 8),
        requiredCardStyles,
        creativityLevel: clampInt(creativityLevel, 2, 1, 4),
        deviationAllowance: clampInt(deviationAllowance, 1, 1, 4),
        sourcePreference,
        socraticModeDefault: policySocraticDefault,
        maxSocraticRounds: clampInt(maxSocraticRounds, 1, 1, 3),
        includeClozeCard,
        customInstructions: customInstructions.trim(),
      },
    });
    if (!saved) return;
    notifications.show({
      title: "Generation policy saved",
      message: "Category-level LLM configuration is active.",
      color: "green",
      icon: <IconCheck size={16} />,
    });
    await refetchPolicy();
  };

  const handleRemoveCategoryPolicy = async () => {
    if (selectedPolicyChoice?.isVirtual) return;
    if (!categoryPolicy?.policyId) return;
    const removed = await removeGenerationPolicy(categoryPolicy.policyId);
    if (!removed) return;
    notifications.show({
      title: "Category policy removed",
      message: "This category now falls back to inherited defaults.",
      color: "green",
      icon: <IconCheck size={16} />,
    });
    await refetchPolicy();
  };

  const applyDoctrinePreset = () => {
    if (!selectedDoctrine) return;
    setTargetCardCount(String(selectedDoctrine.targetCardCount));
    setCreativityLevel(String(selectedDoctrine.creativityLevel));
    setDeviationAllowance(String(selectedDoctrine.deviationAllowance));
    setMaxSocraticRounds(String(selectedDoctrine.maxSocraticRounds));
    setIncludeClozeCard(selectedDoctrine.includeClozeCard);
    setRequiredCardStyles(selectedDoctrine.requiredCardStyles);
    setPolicySocraticDefault(selectedDoctrine.socraticModeDefault);
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Settings</Title>

      {error && (
        <Alert icon={<IconAlertCircle />} color="red" variant="light">
          {error.message}
        </Alert>
      )}

      <Paper withBorder p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Title order={4} mb="md">
          Profile
        </Title>
        <Stack gap="md">
          <TextInput
            label="Email"
            value={user?.email ?? ""}
            disabled
            description="Email cannot be changed"
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />
          <TextInput
            label="Username"
            placeholder="Display name"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />
          <Select
            label="Timezone"
            data={COMMON_TIMEZONES}
            value={timezone}
            onChange={(v) => setTimezone(v ?? timezone)}
            searchable
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />
          <Button
            onClick={handleSaveProfile}
            loading={loading}
            w="fit-content"
            style={getPrimaryActionStyle(isDark)}
          >
            Save Changes
          </Button>
        </Stack>
      </Paper>

      <Paper withBorder p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Title order={4} mb="md">
          Learning Defaults
        </Title>

        {preferencesError && (
          <Alert mb="md" icon={<IconAlertCircle />} color="red" variant="light">
            {preferencesError.message}
          </Alert>
        )}

        <Stack gap="md">
          <Select
            label="Default category for new sessions"
            placeholder="Choose default category"
            data={categoryOptions}
            value={defaultCategoryId}
            onChange={setDefaultCategoryId}
            clearable
            disabled={preferencesLoading}
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />
          <TagsInput
            label="Default tags"
            placeholder="Add tags..."
            value={defaultTags}
            onChange={setDefaultTags}
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />
          <Checkbox
            label="Socratic mode enabled by default"
            checked={defaultSocraticEnabled}
            color="grape"
            onChange={(e) => setDefaultSocraticEnabled(e.currentTarget.checked)}
          />
          <Button
            onClick={handleSaveLearningPreferences}
            loading={preferencesSaving}
            w="fit-content"
            style={getPrimaryActionStyle(isDark)}
          >
            Save Learning Defaults
          </Button>
        </Stack>
      </Paper>

      <Paper withBorder p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Title order={4} mb="md">
          Category Generation Policy
        </Title>

        {(categoryPolicyError || policyWriteError) && (
          <Alert mb="md" icon={<IconAlertCircle />} color="red" variant="light">
            {(categoryPolicyError ?? policyWriteError)?.message}
          </Alert>
        )}

        <Stack gap="md">
          <Select
            label="Category"
            data={policyCategoryOptions}
            value={policyCategoryKey}
            onChange={setPolicyCategoryKey}
            placeholder="Select category"
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />

          <Text size="sm" c="dimmed">
            {selectedPolicyChoice?.isVirtual
              ? `Virtual category. Runtime currently maps saves to ${selectedPolicyChoice.backendSlug ?? "a backend category"} until backend category APIs are upgraded.`
              : categoryPolicy
                ? "Editing active category override."
                : "No category override found. Saving creates one."}
          </Text>
          {selectedDoctrine && (
            <Group justify="space-between" align="center" wrap="wrap">
              <Text size="xs" c="dimmed">
                Doctrine preset: {selectedDoctrine.memoryArchetype} · exactness{" "}
                {selectedDoctrine.exactnessMode}
              </Text>
              <Button variant="light" size="xs" onClick={applyDoctrinePreset}>
                Apply doctrine preset
              </Button>
            </Group>
          )}

          <Group grow>
            <Select
              label="Target cards"
              data={["1", "2", "3", "4", "5", "6", "7", "8"]}
              value={targetCardCount}
              onChange={(v) => setTargetCardCount(v ?? targetCardCount)}
              radius="xl"
              styles={{ input: getInputSurfaceStyle(isDark) }}
            />
            <Select
              label="Creativity level"
              data={["1", "2", "3", "4"]}
              value={creativityLevel}
              onChange={(v) => setCreativityLevel(v ?? creativityLevel)}
              radius="xl"
              styles={{ input: getInputSurfaceStyle(isDark) }}
            />
          </Group>
          <Text size="xs" c="dimmed">
            {`Creativity ${creativityLevel} - ${
              CREATIVITY_BLURBS[creativityLevel]?.label ?? "Balanced"
            }: ${CREATIVITY_BLURBS[creativityLevel]?.blurb ?? ""}`}
          </Text>

          <Group grow>
            <Select
              label="Deviation allowance"
              data={["1", "2", "3", "4"]}
              value={deviationAllowance}
              onChange={(v) => setDeviationAllowance(v ?? deviationAllowance)}
              radius="xl"
              styles={{ input: getInputSurfaceStyle(isDark) }}
            />
            <Select
              label="Max Socratic rounds"
              data={["1", "2", "3"]}
              value={maxSocraticRounds}
              onChange={(v) => setMaxSocraticRounds(v ?? maxSocraticRounds)}
              radius="xl"
              styles={{ input: getInputSurfaceStyle(isDark) }}
            />
          </Group>
          <Text size="xs" c="dimmed">
            {`Strictness ${deviationAllowance} - ${
              STRICTNESS_BLURBS[deviationAllowance]?.label ?? "Tight"
            }: ${STRICTNESS_BLURBS[deviationAllowance]?.blurb ?? ""}`}
          </Text>
          <Text size="xs" c="dimmed">
            Round 3 is supported by the frontend flow; backend policy validation must also allow it.
          </Text>

          <MultiSelect
            label="Required card styles"
            data={CARD_STYLE_OPTIONS}
            value={requiredCardStyles}
            onChange={(values) => {
              const normalized = normalizeCardStyles(values);
              setRequiredCardStyles(normalized.length > 0 ? normalized : ["direct_qa"]);
            }}
            searchable
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />
          <Checkbox
            label="Include a fill-in-the-blank card"
            checked={includeClozeCard}
            color="grape"
            onChange={(e) => setIncludeClozeCard(e.currentTarget.checked)}
          />

          <TagsInput
            label="Source preference hints"
            description="Optional hints for future source-routing support."
            value={sourcePreference}
            onChange={setSourcePreference}
            placeholder="e.g. webmd, textbook"
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />

          <Textarea
            label="Custom LLM instructions"
            description="Optional category-specific instructions appended to LLM context."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.currentTarget.value)}
            placeholder="Example: Ask where I heard/read this, then create cards that test the same fact in different ways."
            minRows={3}
            maxRows={8}
            radius="xl"
            styles={{ input: getInputSurfaceStyle(isDark) }}
          />
          {selectedPolicyChoice?.slug === "new-word-plus" && (
            <Group>
              <Button
                variant="light"
                size="xs"
                onClick={() => setCustomInstructions(NEW_WORD_PLUS_TEMPLATE)}
                style={getGlassInsetStyle(isDark)}
              >
                Use New Word+ template
              </Button>
              <Text size="xs" c="dimmed">
                Context-first questioning and context-recall card behavior.
              </Text>
            </Group>
          )}

          <Checkbox
            label="Use Socratic mode by default for this category"
            checked={policySocraticDefault}
            color="grape"
            onChange={(e) => setPolicySocraticDefault(e.currentTarget.checked)}
          />

          <Group>
            <Button
              onClick={handleSaveCategoryPolicy}
              loading={upserting || categoryPolicyLoading}
              disabled={!policyCategoryId || Boolean(selectedPolicyChoice?.isVirtual)}
              style={getPrimaryActionStyle(isDark)}
            >
              Save Category Policy
            </Button>
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              onClick={handleRemoveCategoryPolicy}
              loading={removing}
              disabled={!categoryPolicy?.policyId || Boolean(selectedPolicyChoice?.isVirtual)}
              style={getGlassInsetStyle(isDark)}
            >
              Remove Override
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="lg" radius="xl" style={getSubtleSectionStyle(isDark)}>
        <Title order={4} mb="md">
          Account Info
        </Title>
        <Stack gap="xs">
          <Text size="sm">
            <Text span fw={500}>
              User ID:
            </Text>{" "}
            {user?.userId}
          </Text>
          <Text size="sm">
            <Text span fw={500}>
              Member since:
            </Text>{" "}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "N/A"}
          </Text>
        </Stack>
        <Divider my="md" />
        <Text size="sm" c="dimmed">
          Password change and account deletion are not yet available.
        </Text>
      </Paper>
    </Stack>
  );
}
