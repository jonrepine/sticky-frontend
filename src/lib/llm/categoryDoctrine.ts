import type { Category, DeepAttribute, ExactnessMode, GenerationCardStyle, GenerationPolicyConfig } from "../../types";

export interface CategoryDoctrine {
  slug: string;
  label: string;
  memoryArchetype: string;
  exactnessMode: ExactnessMode;
  targetCardCount: number;
  requiredCardStyles: GenerationCardStyle[];
  creativityLevel: number;
  deviationAllowance: number;
  maxSocraticRounds: number;
  includeClozeCard: boolean;
  socraticModeDefault: boolean;
  deepAttributesSupported: DeepAttribute[];
  deepAttributesStronglyPrompted?: DeepAttribute[];
}

export interface CategoryChoice {
  key: string;
  slug: string;
  label: string;
  isVirtual: boolean;
  backendCategoryId: string | null;
  backendSlug: string | null;
}

export const CATEGORY_DOCTRINE: Record<string, CategoryDoctrine> = {
  "new-word": {
    slug: "new-word",
    label: "New Word",
    memoryArchetype: "vocab_usage",
    exactnessMode: "term_exact",
    targetCardCount: 3,
    requiredCardStyles: ["cloze_contextual", "definition_to_word", "association_to_word"],
    creativityLevel: 2,
    deviationAllowance: 1,
    maxSocraticRounds: 2,
    includeClozeCard: true,
    socraticModeDefault: true,
    deepAttributesSupported: ["source", "context", "significance", "contrast"],
  },
  "new-word-plus": {
    slug: "new-word-plus",
    label: "New Word+",
    memoryArchetype: "source_anchored_vocab",
    exactnessMode: "term_exact",
    targetCardCount: 3,
    requiredCardStyles: ["cloze_contextual", "definition_to_word", "association_to_word"],
    creativityLevel: 2,
    deviationAllowance: 1,
    maxSocraticRounds: 2,
    includeClozeCard: true,
    socraticModeDefault: true,
    deepAttributesSupported: ["source", "context", "significance"],
    deepAttributesStronglyPrompted: ["source", "context", "significance"],
  },
  fact: {
    slug: "fact",
    label: "Fact",
    memoryArchetype: "proposition",
    exactnessMode: "gist",
    targetCardCount: 3,
    requiredCardStyles: ["direct_qa", "cloze_contextual", "correction_or_application"],
    creativityLevel: 1,
    deviationAllowance: 1,
    maxSocraticRounds: 2,
    includeClozeCard: true,
    socraticModeDefault: true,
    deepAttributesSupported: ["source", "context", "significance"],
  },
  "technical-definition": {
    slug: "technical-definition",
    label: "Technical Definition",
    memoryArchetype: "technical_definition",
    exactnessMode: "term_exact",
    targetCardCount: 3,
    requiredCardStyles: ["concept_to_term", "cloze_contextual", "contrast_to_term"],
    creativityLevel: 1,
    deviationAllowance: 1,
    maxSocraticRounds: 2,
    includeClozeCard: true,
    socraticModeDefault: true,
    deepAttributesSupported: ["domain", "contrast", "source", "significance"],
  },
  joke: {
    slug: "joke",
    label: "Joke",
    memoryArchetype: "exact_recitation",
    exactnessMode: "verbatim",
    targetCardCount: 1,
    requiredCardStyles: ["exact_recitation"],
    creativityLevel: 1,
    deviationAllowance: 1,
    maxSocraticRounds: 1,
    includeClozeCard: false,
    socraticModeDefault: false,
    deepAttributesSupported: ["source", "occasion", "significance"],
  },
  "virtue-life-lesson": {
    slug: "virtue-life-lesson",
    label: "Virtue / Life Lesson",
    memoryArchetype: "principle_with_source",
    exactnessMode: "gist",
    targetCardCount: 3,
    requiredCardStyles: ["scenario_to_principle", "source_to_principle", "application_to_principle"],
    creativityLevel: 2,
    deviationAllowance: 1,
    maxSocraticRounds: 2,
    includeClozeCard: false,
    socraticModeDefault: true,
    deepAttributesSupported: ["source", "context", "significance", "application"],
    deepAttributesStronglyPrompted: ["source", "context", "significance"],
  },
  "quote-proverb-verse": {
    slug: "quote-proverb-verse",
    label: "Quote / Proverb / Verse",
    memoryArchetype: "exact_recitation",
    exactnessMode: "phrase_exact",
    targetCardCount: 2,
    requiredCardStyles: ["cue_to_recitation", "phrase_completion"],
    creativityLevel: 1,
    deviationAllowance: 1,
    maxSocraticRounds: 1,
    includeClozeCard: true,
    socraticModeDefault: false,
    deepAttributesSupported: ["source", "significance", "occasion"],
  },
  "contrast-pair": {
    slug: "contrast-pair",
    label: "Contrast Pair",
    memoryArchetype: "contrast_pair",
    exactnessMode: "term_exact",
    targetCardCount: 3,
    requiredCardStyles: ["contrast_discrimination", "scenario_to_target", "correction_prompt"],
    creativityLevel: 1,
    deviationAllowance: 1,
    maxSocraticRounds: 2,
    includeClozeCard: false,
    socraticModeDefault: true,
    deepAttributesSupported: ["contrast", "domain", "significance"],
  },
  "formula-rule": {
    slug: "formula-rule",
    label: "Formula / Rule",
    memoryArchetype: "formula_rule",
    exactnessMode: "term_exact",
    targetCardCount: 3,
    requiredCardStyles: ["direct_formula", "formula_completion", "application_prompt"],
    creativityLevel: 1,
    deviationAllowance: 1,
    maxSocraticRounds: 2,
    includeClozeCard: true,
    socraticModeDefault: true,
    deepAttributesSupported: ["context", "significance", "application"],
  },
  "procedure-workflow": {
    slug: "procedure-workflow",
    label: "Procedure / Workflow",
    memoryArchetype: "procedure_sequence",
    exactnessMode: "gist",
    targetCardCount: 3,
    requiredCardStyles: ["cue_to_sequence", "next_step", "procedure_cloze"],
    creativityLevel: 1,
    deviationAllowance: 1,
    maxSocraticRounds: 2,
    includeClozeCard: true,
    socraticModeDefault: true,
    deepAttributesSupported: ["context", "significance", "application"],
  },
};

export const BACKEND_SEEDED_CATEGORY_SLUGS = [
  "new-word",
  "new-word-plus",
  "fact",
  "technical-definition",
  "joke",
  "virtue-life-lesson",
  "quote-proverb-verse",
  "contrast-pair",
  "formula-rule",
  "procedure-workflow",
] as const;

export const VIRTUAL_CATEGORY_BACKING_SLUG: Record<string, string> = {
  "virtue-life-lesson": "fact",
  "quote-proverb-verse": "fact",
  "contrast-pair": "new-word",
  "formula-rule": "technical-definition",
  "procedure-workflow": "fact",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "new-word": "grape",
  "new-word-plus": "teal",
  fact: "blue",
  joke: "orange",
  "technical-definition": "cyan",
  "virtue-life-lesson": "lime",
  "quote-proverb-verse": "pink",
  "contrast-pair": "violet",
  "formula-rule": "indigo",
  "procedure-workflow": "green",
};

export function isVirtualCategoryKey(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("virtual:");
}

export function getCategorySlugFromKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isVirtualCategoryKey(value)) return value.replace(/^virtual:/, "");
  return null;
}

export function getDoctrineBySlug(slug: string | null | undefined): CategoryDoctrine | null {
  if (!slug) return null;
  return CATEGORY_DOCTRINE[slug] ?? null;
}

function findCategoryBySlug(categories: Category[], slug: string): Category | null {
  return (
    categories.find((category) => category.slug.toLowerCase() === slug.toLowerCase()) ?? null
  );
}

function resolveBackingCategory(categories: Category[], doctrineSlug: string): Category | null {
  const backingSlug = VIRTUAL_CATEGORY_BACKING_SLUG[doctrineSlug];
  if (backingSlug) {
    const mapped = findCategoryBySlug(categories, backingSlug);
    if (mapped) return mapped;
  }
  const direct = findCategoryBySlug(categories, doctrineSlug);
  if (direct) return direct;
  return categories[0] ?? null;
}

export function buildCategoryChoices(categories: Category[]): CategoryChoice[] {
  if (categories.length === 0) return [];

  const choices: CategoryChoice[] = categories.map((category) => ({
    key: category.categoryId,
    slug: category.slug,
    label: category.name,
    isVirtual: false,
    backendCategoryId: category.categoryId,
    backendSlug: category.slug,
  }));

  Object.values(CATEGORY_DOCTRINE).forEach((doctrine) => {
    if (findCategoryBySlug(categories, doctrine.slug)) return;
    const backing = resolveBackingCategory(categories, doctrine.slug);
    choices.push({
      key: `virtual:${doctrine.slug}`,
      slug: doctrine.slug,
      label: doctrine.label,
      isVirtual: true,
      backendCategoryId: backing?.categoryId ?? null,
      backendSlug: backing?.slug ?? null,
    });
  });

  return choices;
}

export function resolveCategoryChoice(
  choices: CategoryChoice[],
  selectedKey: string | null
): CategoryChoice | null {
  if (!selectedKey) return null;
  return choices.find((choice) => choice.key === selectedKey) ?? null;
}

export function getDoctrineDefaults(slug: string): GenerationPolicyConfig {
  const doctrine = getDoctrineBySlug(slug);
  if (!doctrine) {
    return {
      targetCardCount: 3,
      requiredCardStyles: ["direct_qa", "cloze_contextual"],
      creativityLevel: 2,
      deviationAllowance: 1,
      maxSocraticRounds: 2,
      includeClozeCard: true,
      socraticModeDefault: true,
      customInstructions: "",
    };
  }

  return {
    targetCardCount: doctrine.targetCardCount,
    requiredCardStyles: doctrine.requiredCardStyles,
    creativityLevel: doctrine.creativityLevel,
    deviationAllowance: doctrine.deviationAllowance,
    maxSocraticRounds: doctrine.maxSocraticRounds,
    includeClozeCard: doctrine.includeClozeCard,
    socraticModeDefault: doctrine.socraticModeDefault,
    customInstructions: "",
  };
}

