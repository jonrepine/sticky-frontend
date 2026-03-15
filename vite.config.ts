import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { getDoctrineBySlug } from "./src/lib/llm/categoryDoctrine";
import { buildGenerationSystemPrompt } from "./src/lib/llm/promptContext";

interface LlmProxyOptions {
  apiKey?: string;
  model?: string;
  allowFallback?: boolean;
}

type GenerationCardStyle =
  | "direct_qa"
  | "cloze_contextual"
  | "reverse_qa"
  | "example_usage"
  | "analogy"
  | "mnemonic"
  | "scenario"
  | "definition_to_word"
  | "association_to_word"
  | "correction_or_application"
  | "concept_to_term"
  | "contrast_to_term"
  | "exact_recitation"
  | "scenario_to_principle"
  | "source_to_principle"
  | "application_to_principle"
  | "cue_to_recitation"
  | "phrase_completion"
  | "contrast_discrimination"
  | "scenario_to_target"
  | "correction_prompt"
  | "direct_formula"
  | "formula_completion"
  | "application_prompt"
  | "cue_to_sequence"
  | "next_step"
  | "procedure_cloze";

type DeepAttribute =
  | "source"
  | "context"
  | "significance"
  | "usage"
  | "domain"
  | "contrast"
  | "occasion"
  | "application";

type ExactnessMode = "gist" | "term_exact" | "phrase_exact" | "verbatim";

type NoteSpec = {
  categorySlug: string;
  coreAnswer: string;
  coreExplanation?: string;
  exactnessMode: ExactnessMode;
  deepAttributes: Partial<Record<DeepAttribute, string>>;
  selectedDeepAttributes: DeepAttribute[];
  frontReminderText?: string;
  maxIndependentFactsPerNote: number;
};

type ValidatorFlags = {
  sameCoreAnswerAcrossVariants: boolean;
  selectedDeepAttributesPresentOnEveryCard: boolean;
  frontReminderMatchesSelectedAttributes: boolean;
  backStartsWithCoreAnswer: boolean;
  noUnboundNewFactsIntroduced: boolean;
  cardMainPromptIsSingular: boolean;
  categoryStyleRulesSatisfied: boolean;
};

type GenerationConfig = {
  targetCardCount: number;
  requiredCardStyles: GenerationCardStyle[];
  creativityLevel: number;
  deviationAllowance: number;
  sourcePreference: string[];
  socraticModeDefault: boolean;
  maxSocraticRounds: number;
  includeClozeCard: boolean;
  customInstructions: string;
};

const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  targetCardCount: 3,
  requiredCardStyles: ["direct_qa", "cloze_contextual"],
  creativityLevel: 2,
  deviationAllowance: 1,
  sourcePreference: [],
  socraticModeDefault: true,
  maxSocraticRounds: 2,
  includeClozeCard: true,
  customInstructions: "",
};

const VALID_CARD_STYLES: GenerationCardStyle[] = [
  "direct_qa",
  "cloze_contextual",
  "reverse_qa",
  "example_usage",
  "analogy",
  "mnemonic",
  "scenario",
  "definition_to_word",
  "association_to_word",
  "correction_or_application",
  "concept_to_term",
  "contrast_to_term",
  "exact_recitation",
  "scenario_to_principle",
  "source_to_principle",
  "application_to_principle",
  "cue_to_recitation",
  "phrase_completion",
  "contrast_discrimination",
  "scenario_to_target",
  "correction_prompt",
  "direct_formula",
  "formula_completion",
  "application_prompt",
  "cue_to_sequence",
  "next_step",
  "procedure_cloze",
];

const VALID_CARD_STYLE_SET = new Set<GenerationCardStyle>(VALID_CARD_STYLES);

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function normalizeGenerationConfig(raw: unknown): GenerationConfig {
  const input =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const requiredCardStyles = Array.isArray(input.requiredCardStyles)
    ? input.requiredCardStyles
        .map((style) => String(style))
        .filter((style): style is GenerationCardStyle =>
          VALID_CARD_STYLE_SET.has(style as GenerationCardStyle)
        )
    : [];

  return {
    targetCardCount: clampInt(input.targetCardCount, 1, 8, DEFAULT_GENERATION_CONFIG.targetCardCount),
    requiredCardStyles:
      requiredCardStyles.length > 0
        ? requiredCardStyles
        : DEFAULT_GENERATION_CONFIG.requiredCardStyles,
    creativityLevel: clampInt(input.creativityLevel, 1, 4, DEFAULT_GENERATION_CONFIG.creativityLevel),
    deviationAllowance: clampInt(
      input.deviationAllowance,
      1,
      4,
      DEFAULT_GENERATION_CONFIG.deviationAllowance
    ),
    sourcePreference: Array.isArray(input.sourcePreference)
      ? input.sourcePreference.map((source) => String(source)).filter(Boolean).slice(0, 10)
      : [],
    socraticModeDefault:
      typeof input.socraticModeDefault === "boolean"
        ? input.socraticModeDefault
        : DEFAULT_GENERATION_CONFIG.socraticModeDefault,
    maxSocraticRounds: clampInt(
      input.maxSocraticRounds,
      1,
      3,
      DEFAULT_GENERATION_CONFIG.maxSocraticRounds
    ),
    includeClozeCard:
      typeof input.includeClozeCard === "boolean"
        ? input.includeClozeCard
        : DEFAULT_GENERATION_CONFIG.includeClozeCard,
    customInstructions:
      typeof input.customInstructions === "string"
        ? input.customInstructions.trim().slice(0, 4000)
        : DEFAULT_GENERATION_CONFIG.customInstructions,
  };
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        if (!body) {
          resolve({});
          return;
        }
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(
  res: ServerResponse,
  status: number,
  payload: Record<string, unknown> | Record<string, unknown>[]
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getSocraticStage(round: number): "context" | "structure" | "disambiguation" {
  if (round <= 1) return "context";
  if (round === 2) return "structure";
  return "disambiguation";
}

const DEEP_ATTRIBUTE_ORDER: DeepAttribute[] = [
  "source",
  "context",
  "significance",
  "usage",
  "domain",
  "contrast",
  "occasion",
  "application",
];

const DEEP_ATTRIBUTE_LABEL: Record<DeepAttribute, string> = {
  source: "Source",
  context: "Context",
  significance: "Significance",
  usage: "Usage",
  domain: "Domain",
  contrast: "Contrast",
  occasion: "Occasion",
  application: "Application",
};

const REMINDER_LABEL: Record<DeepAttribute, string> = {
  source: "source",
  context: "context",
  significance: "why it matters",
  usage: "usage",
  domain: "domain",
  contrast: "contrast",
  occasion: "occasion",
  application: "application",
};

const FORBIDDEN_STYLES = new Set(["true_false"]);
const MAX_CARD_COUNT = 8;

type SocraticContextEntry = {
  questionId?: string;
  question?: string;
  selectedOption?: string;
  typedAnswer?: string;
  notImportant?: boolean;
};

function isLikelyOverloadedInput(inputText: string): boolean {
  const value = inputText.trim().toLowerCase();
  if (!value) return false;
  const tokenCount = value.split(/\s+/).filter(Boolean).length;
  if (tokenCount > 45) return true;
  if (value.split(/[.;]/).filter(Boolean).length > 4) return true;
  return /\b(entire|everything|all of|all about|whole|complete)\b/.test(value);
}

function hasNarrowingSignal(qaContext: SocraticContextEntry[]): boolean {
  return qaContext.some((entry) => {
    const typed = String(entry.typedAnswer ?? "").trim();
    const selected = String(entry.selectedOption ?? "").trim();
    return typed.length >= 10 || selected.length >= 3;
  });
}

function detectDeepAttributes(text: string): DeepAttribute[] {
  const value = text.toLowerCase();
  const attrs: DeepAttribute[] = [];
  if (/\b(source|where did|encountered|heard|read)\b/.test(value)) attrs.push("source");
  if (/\b(context|usage|used|situation|scene)\b/.test(value)) attrs.push("context");
  if (/\b(why|significance|matters|important)\b/.test(value)) attrs.push("significance");
  if (/\busage\b/.test(value)) attrs.push("usage");
  if (/\bdomain|field\b/.test(value)) attrs.push("domain");
  if (/\bcontrast|confuse|confusable|opposite|versus\b/.test(value)) attrs.push("contrast");
  if (/\boccasion|when did\b/.test(value)) attrs.push("occasion");
  if (/\bapply|application|when to use\b/.test(value)) attrs.push("application");
  return attrs;
}

function inferCoreAnswer(inputText: string, categorySlug: string, qaContext: SocraticContextEntry[]): string {
  const explicitCore = qaContext.find((entry) =>
    /\b(single thing|core answer|main target|single fact)\b/i.test(String(entry.question ?? ""))
  );
  const explicitAnswer = String(explicitCore?.typedAnswer ?? explicitCore?.selectedOption ?? "").trim();
  if (explicitAnswer) return explicitAnswer;

  const raw = inputText.trim();
  if (!raw) return "unknown";

  if (categorySlug === "new-word" || categorySlug === "new-word-plus") {
    const token = raw.split(/[\s,:;()]+/).find(Boolean);
    return token ?? raw;
  }

  const firstLine = raw.split(/\n+/)[0]?.trim() ?? raw;
  if (firstLine.includes(":")) {
    const left = firstLine.split(":")[0]?.trim();
    if (left) return left;
  }
  return firstLine.length > 120 ? `${firstLine.slice(0, 117).trim()}...` : firstLine;
}

function inferCoreExplanation(inputText: string, qaContext: SocraticContextEntry[]): string | undefined {
  const explanationEntry = qaContext.find((entry) =>
    /\b(meaning|definition|explain|lesson|formula|rule)\b/i.test(String(entry.question ?? ""))
  );
  const explicit = String(explanationEntry?.typedAnswer ?? explanationEntry?.selectedOption ?? "").trim();
  if (explicit) return explicit;
  const trimmed = inputText.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 180 ? `${trimmed.slice(0, 177).trim()}...` : trimmed;
}

function buildFrontReminder(selected: DeepAttribute[]): string | undefined {
  if (selected.length === 0) return undefined;
  const labels = selected.map((attr) => REMINDER_LABEL[attr]).filter(Boolean);
  if (labels.length === 0) return undefined;
  return `Also recall: ${labels.join(" • ")}`;
}

function buildNoteSpec(input: {
  inputText: string;
  categorySlug: string;
  categoryName: string;
  qaContext: SocraticContextEntry[];
  generationConfig: GenerationConfig;
}): NoteSpec {
  const doctrine = getDoctrineBySlug(input.categorySlug);
  const exactnessMode = (doctrine?.exactnessMode ?? "gist") as ExactnessMode;
  const supported = new Set<DeepAttribute>((doctrine?.deepAttributesSupported ?? []) as DeepAttribute[]);
  const stronglyPrompted = new Set<DeepAttribute>(
    (doctrine?.deepAttributesStronglyPrompted ?? []) as DeepAttribute[]
  );

  const deepAttributes: Partial<Record<DeepAttribute, string>> = {};
  const notImportant = new Set<DeepAttribute>();

  input.qaContext.forEach((entry) => {
    const question = String(entry.question ?? "");
    const answer = String(entry.typedAnswer ?? entry.selectedOption ?? "").trim();
    const attrs = detectDeepAttributes(`${question} ${answer}`);
    if (attrs.length === 0) return;
    if (entry.notImportant) {
      attrs.forEach((attr) => notImportant.add(attr));
      return;
    }
    attrs.forEach((attr) => {
      if (answer) deepAttributes[attr] = answer;
    });
  });

  stronglyPrompted.forEach((attr) => {
    if (!notImportant.has(attr) && !deepAttributes[attr]) {
      deepAttributes[attr] = "Captured in session context";
    }
  });

  const selectedDeepAttributes = DEEP_ATTRIBUTE_ORDER.filter(
    (attr) =>
      (!supported.size || supported.has(attr)) &&
      !notImportant.has(attr) &&
      Boolean(deepAttributes[attr])
  );

  return {
    categorySlug: input.categorySlug || "fact",
    coreAnswer: inferCoreAnswer(input.inputText, input.categorySlug, input.qaContext),
    coreExplanation: inferCoreExplanation(input.inputText, input.qaContext),
    exactnessMode,
    deepAttributes,
    selectedDeepAttributes,
    frontReminderText: buildFrontReminder(selectedDeepAttributes),
    maxIndependentFactsPerNote: 1,
  };
}

function buildRejectionCard(): DraftCard {
  return {
    front: "This note was overloaded.",
    back: "You tried to put too much in one card. Delete this card and try again.",
    selectedByDefault: true,
    cardType: "rejection",
  };
}

function buildCategoryAwareQuestions(input: {
  inputText: string;
  categoryName: string;
  categorySlug: string;
  qaContext: SocraticContextEntry[];
  round: number;
  maxRounds: number;
}): {
  round: number;
  stage: "context" | "structure" | "disambiguation";
  needsFollowUp: boolean;
  reason: string;
  questions: Array<{ id: string; text: string; options?: string[] }>;
} {
  const stage = getSocraticStage(input.round);
  if (input.round >= input.maxRounds) {
    return {
      round: input.round,
      stage,
      needsFollowUp: false,
      reason: "Reached configured Socratic round cap.",
      questions: [],
    };
  }

  const overloaded = isLikelyOverloadedInput(input.inputText);
  if (overloaded && !hasNarrowingSignal(input.qaContext)) {
    return {
      round: input.round,
      stage: "context",
      needsFollowUp: input.round < input.maxRounds,
      reason: "Input appears overloaded; collecting one atomic target first.",
      questions: [
        {
          id: "atomicity-check",
          text: "What single thing should this note help you recall later?",
          options: ["One term", "One proposition", "One formula/rule", "One short sequence"],
        },
      ],
    };
  }

  const askedText = input.qaContext.map((entry) => `${entry.question ?? ""}`.toLowerCase()).join(" ");
  const hasMeaning = /\b(mean|definition)\b/.test(askedText);
  const hasSourceContext = /\b(source|where did|context|encounter)\b/.test(askedText);
  const hasSignificance = /\b(significance|why it matters)\b/.test(askedText);

  const questions: Array<{ id: string; text: string; options?: string[] }> = [];
  const slug = input.categorySlug.toLowerCase();

  if (input.round === 1) {
    if (slug === "new-word" || slug === "new-word-plus") {
      if (!hasMeaning) {
        questions.push({
          id: "meaning-check",
          text: "What does this word mean in simple terms?",
          options: ["Short definition", "Usage meaning", "Still unsure"],
        });
      }
      questions.push({
        id: "usage-check",
        text: "Do you have a sentence where you saw it, or should I create one?",
        options: ["I have a sentence", "Create one for me", "Skip sentence context"],
      });
    } else if (slug === "technical-definition") {
      questions.push({ id: "domain-check", text: "What field/domain is this from?" });
      questions.push({ id: "definition-check", text: "What is the simplest correct definition?" });
      questions.push({ id: "contrast-check", text: "What term do you confuse it with most?" });
    } else if (slug === "joke") {
      questions.push({
        id: "joke-cue-check",
        text: "What short cue should trigger this joke?",
      });
      questions.push({
        id: "joke-exactness-check",
        text: "Do you want exact wording or gist mode?",
        options: ["Exact wording", "Gist mode"],
      });
    } else if (slug === "quote-proverb-verse") {
      questions.push({
        id: "quote-exact-check",
        text: "Should this be phrase-exact or full verbatim?",
        options: ["Phrase exact", "Verbatim"],
      });
    } else if (slug === "procedure-workflow") {
      questions.push({
        id: "procedure-length-check",
        text: "Is this a short cohesive sequence (3-5 steps)?",
        options: ["Yes, short sequence", "No, too long"],
      });
    } else {
      questions.push({
        id: "single-fact-check",
        text: "What single fact should this note capture?",
      });
    }
  }

  if (!hasSourceContext) {
    questions.push({
      id: "anchor-check",
      text: "Where did you encounter this? Should we track source/context for better recall?",
      options: ["Track source + context", "Source only", "Not important"],
    });
  }
  if (!hasSignificance) {
    questions.push({
      id: "value-check",
      text: "Is the why behind this obvious, or should we add a Significance section to make it stick?",
      options: ["Add significance", "Not important"],
    });
  }

  const limited = questions.slice(0, 4);
  return {
    round: input.round,
    stage,
    needsFollowUp: limited.length > 0 && input.round < input.maxRounds,
    reason: limited.length > 0 ? "Collecting only missing category-critical fields." : "Enough context to generate.",
    questions: limited,
  };
}

type DraftCard = {
  front: string;
  back: string;
  selectedByDefault: boolean;
  cardType?: string;
  angle?: string;
  scopeReason?: string;
};

function normalizeCardText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isQuestionCard(card: DraftCard): boolean {
  const front = card.front.trim();
  return (
    front.endsWith("?") ||
    /^(what|which|who|when|where|why|how|define|explain|name)\b/i.test(front)
  );
}

function isClozeCard(card: DraftCard): boolean {
  return /_{3,}|\[blank\]|\bfill in the blank\b/i.test(card.front);
}

function isContextRecallCard(card: DraftCard): boolean {
  return /\b(context|quote|scene|situation|usage)\b/i.test(card.front);
}

function buildContextualClozeCard(inputText: string): DraftCard {
  const tokens = inputText.trim().split(/\s+/);
  if (tokens.length < 4) {
    return {
      front: `Fill in the blank with the key term: ${inputText.trim()} = _____`,
      back: inputText.trim(),
      selectedByDefault: true,
      cardType: "cloze_contextual",
    };
  }
  let blankIdx = Math.floor(tokens.length / 2);
  const preferred = tokens.findIndex((token) => token.length >= 6);
  if (preferred >= 0) blankIdx = preferred;
  const answer = tokens[blankIdx] ?? "";
  const withBlank = tokens.map((token, idx) => (idx === blankIdx ? "_____" : token)).join(" ");
  return {
    front: `Fill in the blank: ${withBlank}`,
    back: answer ? `${answer} (from: ${inputText.trim()})` : inputText.trim(),
    selectedByDefault: true,
    cardType: "cloze_contextual",
  };
}

function buildDirectQuestionCard(inputText: string): DraftCard {
  return {
    front: `What is the key fact here? ${inputText.trim()}`,
    back: inputText.trim(),
    selectedByDefault: true,
    cardType: "direct_qa",
  };
}

function buildNewWordPlusContextCard(inputText: string): DraftCard {
  return {
    front: `In what memorable context is this phrase/word used: "${inputText.trim()}"?`,
    back: `Recall the specific context and wording for "${inputText.trim()}".`,
    selectedByDefault: true,
    cardType: "context_recall",
  };
}

function dedupeCards(cards: DraftCard[]): DraftCard[] {
  const seen = new Set<string>();
  const output: DraftCard[] = [];
  for (const card of cards) {
    const key = `${normalizeCardText(card.front)}|||${normalizeCardText(card.back)}`;
    if (!card.front.trim() || !card.back.trim() || seen.has(key)) continue;
    seen.add(key);
    output.push(card);
  }
  return output;
}

function cardMatchesStyle(card: DraftCard, style: GenerationCardStyle): boolean {
  if (card.cardType === style) return true;

  switch (style) {
    case "direct_qa":
      return isQuestionCard(card);
    case "cloze_contextual":
      return isClozeCard(card);
    case "reverse_qa":
      return /\breverse\b|from answer/i.test(card.front);
    case "example_usage":
      return /\bexample\b|\buse\b/i.test(card.front);
    case "analogy":
      return /\banalogy\b|\blike\b/i.test(card.front);
    case "mnemonic":
      return /\bmnemonic\b|\bmemory trick\b/i.test(card.front);
    case "scenario":
      return /\bscenario\b|\bsituation\b/i.test(card.front);
    case "definition_to_word":
      return /\bmean|definition|adjective|term\b/i.test(card.front);
    case "association_to_word":
      return /\bsynonym|antonym|contrast|opposite\b/i.test(card.front);
    case "correction_or_application":
      return /\bcorrect|application|applies|claim\b/i.test(card.front);
    case "concept_to_term":
      return /\bconcept|term|describes\b/i.test(card.front);
    case "contrast_to_term":
      return /\bcontrast|not merely|versus|opposite\b/i.test(card.front);
    case "exact_recitation":
      return /\brecite\b/i.test(card.front);
    case "scenario_to_principle":
      return /\bprinciple\b/i.test(card.front);
    case "source_to_principle":
      return /\bsource|coach|learned\b/i.test(card.front);
    case "application_to_principle":
      return /\bapply|application|momentum|dread\b/i.test(card.front);
    case "cue_to_recitation":
      return /\brecite|cue\b/i.test(card.front);
    case "phrase_completion":
      return /\bcomplete the phrase\b/i.test(card.front);
    case "contrast_discrimination":
      return /\bwhich word|contrast|discrimination\b/i.test(card.front);
    case "scenario_to_target":
      return /\bin the sentence|which term\b/i.test(card.front);
    case "correction_prompt":
      return /\bcorrect|choose\b/i.test(card.front);
    case "direct_formula":
      return /\bformula\b/i.test(card.front);
    case "formula_completion":
      return /\bcomplete the formula\b/i.test(card.front);
    case "application_prompt":
      return /\bwhen to use|apply|if you know\b/i.test(card.front);
    case "cue_to_sequence":
      return /\bsequence\b/i.test(card.front);
    case "next_step":
      return /\bnext\b|\bafter\b/i.test(card.front);
    case "procedure_cloze":
      return /\b{{c1::|_____|\bprocedure\b/i.test(card.front);
    default:
      return false;
  }
}

function buildCardForStyle(style: GenerationCardStyle, inputText: string, coreAnswer?: string): DraftCard {
  const trimmed = inputText.trim();
  const answer = coreAnswer?.trim() || trimmed;
  switch (style) {
    case "direct_qa":
      return buildDirectQuestionCard(trimmed);
    case "cloze_contextual":
      return buildContextualClozeCard(trimmed);
    case "reverse_qa":
      return {
        front: `Given this answer, what is the prompt or question? "${trimmed}"`,
        back: `A valid prompt asks for this same core fact: "${trimmed}"`,
        selectedByDefault: true,
        cardType: "reverse_qa",
      };
    case "definition_to_word":
      return {
        front: `What term matches this definition: ${trimmed}?`,
        back: answer,
        selectedByDefault: true,
        cardType: "definition_to_word",
      };
    case "association_to_word":
      return {
        front: `What stronger word is associated with this cue: ${trimmed}?`,
        back: answer,
        selectedByDefault: true,
        cardType: "association_to_word",
      };
    case "correction_or_application":
      return {
        front: `If this claim is misstated, what correct answer fixes it?`,
        back: answer,
        selectedByDefault: true,
        cardType: "correction_or_application",
      };
    case "concept_to_term":
      return {
        front: `Which term best fits this concept? ${trimmed}`,
        back: answer,
        selectedByDefault: true,
        cardType: "concept_to_term",
      };
    case "contrast_to_term":
      return {
        front: `Which term applies here (contrast-aware) rather than its confusable neighbor?`,
        back: answer,
        selectedByDefault: true,
        cardType: "contrast_to_term",
      };
    case "exact_recitation":
      return {
        front: `Can you recite this exactly?`,
        back: answer,
        selectedByDefault: true,
        cardType: "exact_recitation",
      };
    case "scenario_to_principle":
      return {
        front: `In this scenario, what principle should be recalled first?`,
        back: answer,
        selectedByDefault: true,
        cardType: "scenario_to_principle",
      };
    case "source_to_principle":
      return {
        front: `What principle came from this source memory?`,
        back: answer,
        selectedByDefault: true,
        cardType: "source_to_principle",
      };
    case "application_to_principle":
      return {
        front: `What principle should you apply in this moment?`,
        back: answer,
        selectedByDefault: true,
        cardType: "application_to_principle",
      };
    case "cue_to_recitation":
      return {
        front: `Use this cue and recite the exact phrase.`,
        back: answer,
        selectedByDefault: true,
        cardType: "cue_to_recitation",
      };
    case "phrase_completion":
      return {
        front: `Complete this phrase: ${trimmed.replace(answer, "_____")}`,
        back: answer,
        selectedByDefault: true,
        cardType: "phrase_completion",
      };
    case "contrast_discrimination":
      return {
        front: `Using contrast, which target should be recalled?`,
        back: answer,
        selectedByDefault: true,
        cardType: "contrast_discrimination",
      };
    case "scenario_to_target":
      return {
        front: `In this scenario, which target answer is correct?`,
        back: answer,
        selectedByDefault: true,
        cardType: "scenario_to_target",
      };
    case "correction_prompt":
      return {
        front: `What correction term should replace the wrong one?`,
        back: answer,
        selectedByDefault: true,
        cardType: "correction_prompt",
      };
    case "direct_formula":
      return {
        front: `What is the exact formula/rule?`,
        back: answer,
        selectedByDefault: true,
        cardType: "direct_formula",
      };
    case "formula_completion":
      return {
        front: `Complete the formula/rule: ${trimmed}`,
        back: answer,
        selectedByDefault: true,
        cardType: "formula_completion",
      };
    case "application_prompt":
      return {
        front: `When should this formula/rule be applied?`,
        back: answer,
        selectedByDefault: true,
        cardType: "application_prompt",
      };
    case "cue_to_sequence":
      return {
        front: `Given this cue, what full sequence should you recall?`,
        back: answer,
        selectedByDefault: true,
        cardType: "cue_to_sequence",
      };
    case "next_step":
      return {
        front: `After this point, what is the next step?`,
        back: answer,
        selectedByDefault: true,
        cardType: "next_step",
      };
    case "procedure_cloze":
      return {
        front: `In this procedure line, fill the blank: ${trimmed.replace(answer, "_____")}`,
        back: answer,
        selectedByDefault: true,
        cardType: "procedure_cloze",
      };
    case "example_usage":
      return {
        front: `Give one concise example that demonstrates: ${trimmed}`,
        back: `A valid example should clearly reflect this fact: ${trimmed}`,
        selectedByDefault: true,
        cardType: "example_usage",
      };
    case "analogy":
      return {
        front: `What simple analogy helps remember: ${trimmed}?`,
        back: `Use an analogy that preserves this exact idea: ${trimmed}`,
        selectedByDefault: true,
        cardType: "analogy",
      };
    case "mnemonic":
      return {
        front: `Create or recall a mnemonic for: ${trimmed}`,
        back: `Mnemonic should map back to this one fact: ${trimmed}`,
        selectedByDefault: true,
        cardType: "mnemonic",
      };
    case "scenario":
      return {
        front: `In what scenario would this be the correct recall: ${trimmed}?`,
        back: `Any scenario answer must preserve this one fact: ${trimmed}`,
        selectedByDefault: true,
        cardType: "scenario",
      };
    default:
      return buildDirectQuestionCard(trimmed);
  }
}

function resolveTargetCardCount(inputText: string, config: GenerationConfig, isNewWordPlus: boolean): number {
  const tokenCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  const discretionary = tokenCount <= 3 ? Math.max(1, config.targetCardCount - 1) : config.targetCardCount;
  const requiredStyleCount = config.requiredCardStyles.filter(
    (style) => config.includeClozeCard || style !== "cloze_contextual"
  ).length;
  const defaultFloor = config.includeClozeCard ? 2 : 1;
  const coverageFloor = Math.max(
    isNewWordPlus ? 3 : defaultFloor,
    requiredStyleCount > 0 ? requiredStyleCount : defaultFloor
  );
  return Math.min(8, Math.max(discretionary, coverageFloor));
}

function ensureCardStyleCoverage(input: {
  cards: DraftCard[];
  inputText: string;
  categoryName: string;
  categorySlug: string;
  generationConfig: GenerationConfig;
}): DraftCard[] {
  const cards = [...input.cards];
  const requiredStyles = (
    input.generationConfig.requiredCardStyles.length > 0
      ? input.generationConfig.requiredCardStyles
      : DEFAULT_GENERATION_CONFIG.requiredCardStyles
  ).filter((style) => input.generationConfig.includeClozeCard || style !== "cloze_contextual");

  for (const style of requiredStyles) {
    if (!cards.some((card) => cardMatchesStyle(card, style))) {
      cards.push(buildCardForStyle(style, input.inputText));
    }
  }

  if (!cards.some(isQuestionCard)) {
    cards.unshift(buildDirectQuestionCard(input.inputText));
  }
  if (input.generationConfig.includeClozeCard && !cards.some(isClozeCard)) {
    cards.push(buildContextualClozeCard(input.inputText));
  }

  const isNewWordPlus =
    input.categorySlug.toLowerCase() === "new-word-plus" ||
    input.categoryName.toLowerCase() === "new word+";
  if (isNewWordPlus && !cards.some(isContextRecallCard)) {
    cards.push(buildNewWordPlusContextCard(input.inputText));
  }

  const deduped = dedupeCards(cards);
  const targetCount = resolveTargetCardCount(input.inputText, input.generationConfig, isNewWordPlus);
  return deduped.slice(0, targetCount);
}

function buildFallbackCards(
  inputText: string,
  categoryName: string,
  categorySlug: string,
  generationConfig: GenerationConfig
): {
  cards: DraftCard[];
} {
  const trimmed = inputText.trim();
  const baseCards: DraftCard[] = [
    {
      front: `What is the key fact in this statement?`,
      back: trimmed,
      selectedByDefault: true,
      cardType: "direct_qa",
    },
    {
      front: `Why does this fact matter?`,
      back: trimmed,
      selectedByDefault: true,
      cardType: "importance",
    },
  ];
  if (generationConfig.includeClozeCard) {
    baseCards.push({
      front: `Fill in the blank: ${buildContextualClozeCard(trimmed).front.replace(
        /^Fill in the blank:\s*/i,
        ""
      )}`,
      back: buildContextualClozeCard(trimmed).back,
      selectedByDefault: true,
      cardType: "cloze_contextual",
    });
  }

  return {
    cards: ensureCardStyleCoverage({
      cards: baseCards,
      inputText: trimmed,
      categoryName,
      categorySlug,
      generationConfig,
    }),
  };
}

function formatBackBundle(noteSpec: NoteSpec): string {
  const lines: string[] = [noteSpec.coreAnswer.trim()];
  if (noteSpec.coreExplanation?.trim()) {
    lines.push(`Meaning / Explanation: ${noteSpec.coreExplanation.trim()}`);
  }
  noteSpec.selectedDeepAttributes.forEach((attr) => {
    const value = noteSpec.deepAttributes[attr]?.trim();
    if (!value) return;
    lines.push(`${DEEP_ATTRIBUTE_LABEL[attr]}: ${value}`);
  });
  return lines.join("\n");
}

function enforceRenderingContract(card: DraftCard, noteSpec: NoteSpec): DraftCard {
  const reminder = noteSpec.frontReminderText?.trim();
  const prompt = card.front.trim();
  const front =
    reminder && !prompt.toLowerCase().startsWith(reminder.toLowerCase())
      ? `${reminder}\n\n${prompt}`
      : prompt;
  return {
    ...card,
    front,
    back: formatBackBundle(noteSpec),
  };
}

function resolveCategoryStyles(categorySlug: string, generationConfig: GenerationConfig): GenerationCardStyle[] {
  const doctrine = getDoctrineBySlug(categorySlug);
  const baseStyles =
    generationConfig.requiredCardStyles.length > 0
      ? generationConfig.requiredCardStyles
      : ((doctrine?.requiredCardStyles as GenerationCardStyle[] | undefined) ??
        DEFAULT_GENERATION_CONFIG.requiredCardStyles);
  return baseStyles.filter((style) => !FORBIDDEN_STYLES.has(style));
}

function resolveTargetCount(categorySlug: string, generationConfig: GenerationConfig): number {
  const doctrine = getDoctrineBySlug(categorySlug);
  const doctrineTarget = doctrine?.targetCardCount;
  const configuredTarget = clampInt(generationConfig.targetCardCount, 1, MAX_CARD_COUNT, 3);
  if (!Number.isFinite(doctrineTarget ?? NaN)) return configuredTarget;
  return clampInt(doctrineTarget, 1, MAX_CARD_COUNT, configuredTarget);
}

function normalizeCardsForNoteSpec(input: {
  modelCards: DraftCard[];
  inputText: string;
  noteSpec: NoteSpec;
  categorySlug: string;
  generationConfig: GenerationConfig;
}): DraftCard[] {
  const requiredStyles = resolveCategoryStyles(input.categorySlug, input.generationConfig);
  const stylePlan =
    requiredStyles.length > 0 ? requiredStyles : (DEFAULT_GENERATION_CONFIG.requiredCardStyles as GenerationCardStyle[]);
  const targetCount = resolveTargetCount(input.categorySlug, input.generationConfig);

  const normalized: DraftCard[] = [];
  for (let idx = 0; idx < targetCount; idx += 1) {
    const style = stylePlan[idx % stylePlan.length]!;
    const modelCard = input.modelCards[idx];
    const base =
      modelCard && modelCard.front.trim()
        ? { ...modelCard, cardType: style }
        : buildCardForStyle(style, input.inputText, input.noteSpec.coreAnswer);
    normalized.push(
      enforceRenderingContract(
        {
          ...base,
          selectedByDefault: base.selectedByDefault !== false,
          cardType: style,
        },
        input.noteSpec
      )
    );
  }

  const deduped = dedupeCards(normalized);
  if (deduped.length >= targetCount) return deduped.slice(0, targetCount);

  while (deduped.length < targetCount) {
    const style = stylePlan[deduped.length % stylePlan.length]!;
    deduped.push(
      enforceRenderingContract(
        buildCardForStyle(style, input.inputText, input.noteSpec.coreAnswer),
        input.noteSpec
      )
    );
  }
  return deduped.slice(0, targetCount);
}

function validateCardSet(input: {
  cards: DraftCard[];
  noteSpec: NoteSpec;
  categorySlug: string;
  generationConfig: GenerationConfig;
}): ValidatorFlags {
  const reminder = input.noteSpec.frontReminderText?.trim();
  const selectedLabels = input.noteSpec.selectedDeepAttributes.map(
    (attr) => `${DEEP_ATTRIBUTE_LABEL[attr]}:`
  );
  const requiredStyles = resolveCategoryStyles(input.categorySlug, input.generationConfig);
  const targetCount = resolveTargetCount(input.categorySlug, input.generationConfig);
  const coherence = evaluateSingleAnchorCoherence(
    input.cards,
    input.noteSpec.coreAnswer,
    input.generationConfig.deviationAllowance
  );

  const backStartsWithCoreAnswer = input.cards.every(
    (card) =>
      card.back.trim().split("\n")[0]?.toLowerCase() === input.noteSpec.coreAnswer.trim().toLowerCase()
  );
  const selectedDeepAttributesPresentOnEveryCard =
    selectedLabels.length === 0 ||
    input.cards.every((card) => selectedLabels.every((label) => card.back.includes(label)));
  const frontReminderMatchesSelectedAttributes =
    !reminder || input.cards.every((card) => card.front.trim().startsWith(reminder));
  const cardMainPromptIsSingular = input.cards.every((card) => {
    const withoutReminder = reminder ? card.front.replace(reminder, "").trim() : card.front.trim();
    const questionMarks = (withoutReminder.match(/\?/g) ?? []).length;
    return questionMarks <= 1;
  });
  const categoryStyleRulesSatisfied =
    input.cards.length === targetCount &&
    (requiredStyles.length === 0 ||
      input.cards.every((card, idx) => cardMatchesStyle(card, requiredStyles[idx % requiredStyles.length]!))) &&
    input.cards.every((card) => !FORBIDDEN_STYLES.has(String(card.cardType ?? "").trim()));

  return {
    sameCoreAnswerAcrossVariants: backStartsWithCoreAnswer,
    selectedDeepAttributesPresentOnEveryCard,
    frontReminderMatchesSelectedAttributes,
    backStartsWithCoreAnswer,
    noUnboundNewFactsIntroduced: coherence.passed,
    cardMainPromptIsSingular,
    categoryStyleRulesSatisfied,
  };
}

function creativityToTemperature(level: number): number {
  const normalized = clampInt(level, 1, 4, DEFAULT_GENERATION_CONFIG.creativityLevel);
  return 0.2 + (normalized - 1) * 0.2;
}

function tokenizeMeaningful(text: string): Set<string> {
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "is",
    "are",
    "was",
    "were",
    "be",
    "this",
    "that",
    "it",
    "as",
    "by",
    "from",
    "at",
  ]);
  const parts = normalizeCardText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length >= 3 && !stopwords.has(token));
  return new Set(parts);
}

function evaluateSingleAnchorCoherence(
  cards: DraftCard[],
  factAnchor: string,
  deviationAllowance: number
): { passed: boolean; warnings: string[] } {
  const anchorTokens = tokenizeMeaningful(factAnchor);
  if (anchorTokens.size === 0) {
    return { passed: false, warnings: ["Missing or low-signal factAnchor from model response."] };
  }

  const thresholdByDeviation: Record<number, number> = {
    1: 0.3,
    2: 0.22,
    3: 0.16,
    4: 0.1,
  };
  const threshold = thresholdByDeviation[Math.max(1, Math.min(4, deviationAllowance))] ?? 0.22;
  const warnings: string[] = [];

  cards.forEach((card, idx) => {
    const textTokens = tokenizeMeaningful(`${card.front} ${card.back}`);
    const overlapCount = Array.from(anchorTokens).filter((token) => textTokens.has(token)).length;
    const overlapRatio = overlapCount / anchorTokens.size;
    if (overlapRatio < threshold) {
      warnings.push(`Card ${idx + 1} appears to drift from the fact anchor.`);
    }
  });

  return { passed: warnings.length === 0, warnings };
}

function parseModelCards(raw: unknown): DraftCard[] {
  const cardsRaw = Array.isArray(raw) ? raw : [];
  return cardsRaw
    .map((card: unknown) => {
      const item = card as {
        front?: string;
        back?: string;
        selectedByDefault?: boolean;
        cardType?: string;
        angle?: string;
        scopeReason?: string;
      };
      return {
        front: String(item.front ?? "").trim(),
        back: String(item.back ?? "").trim(),
        selectedByDefault: item.selectedByDefault !== false,
        cardType: String(item.cardType ?? "").trim() || undefined,
        angle: String(item.angle ?? "").trim() || undefined,
        scopeReason: String(item.scopeReason ?? "").trim() || undefined,
      };
    })
    .filter((card: { front: string; back: string }) => card.front && card.back)
    .slice(0, 8);
}

async function openAiJsonCall(options: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      temperature: options.temperature ?? 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = extractJsonObject(content);
  if (!parsed) throw new Error("Failed to parse model JSON response");
  return parsed;
}

function llmLocalProxyPlugin(options: LlmProxyOptions): PluginOption {
  const model = options.model ?? "gpt-4o-mini";
  const hasApiKey = Boolean(options.apiKey && options.apiKey.trim().length > 0);
  const fallbackEnabled = Boolean(options.allowFallback);

  const requireLiveOrFallback = (res: ServerResponse) => {
    if (hasApiKey) return true;
    if (fallbackEnabled) return true;
    sendJson(res, 500, {
      error:
        "LLM is not configured. Set OPENAI_API_KEY in .env or enable OPENAI_ALLOW_FALLBACK=true.",
    });
    return false;
  };

  return {
    name: "sticky-llm-local-proxy",
    configureServer(server) {
      server.middlewares.use("/api/llm/status", async (req, res, next) => {
        if (req.method !== "GET") {
          next();
          return;
        }
        sendJson(res, 200, {
          provider: hasApiKey ? "openai" : "fallback",
          model,
          hasApiKey,
          fallbackEnabled,
          live: hasApiKey,
        });
      });

      server.middlewares.use("/api/llm/socratic-questions", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        try {
          const body = await readJsonBody(req);
          const inputText = String(body.inputText ?? "").trim();
          if (!inputText) {
            sendJson(res, 400, { error: "inputText is required" });
            return;
          }

          if (!requireLiveOrFallback(res)) return;

          const categoryName = String(body.categoryName ?? "General");
          const categorySlug = String(body.categorySlug ?? "general");
          const qaContext = Array.isArray(body.qaContext) ? body.qaContext : [];
          const generationConfig = normalizeGenerationConfig(body.generationConfig);
          const roundRaw = Number(body.round ?? 1);
          const maxRoundsRaw = Number(body.maxRounds ?? generationConfig.maxSocraticRounds);
          const round = Number.isFinite(roundRaw) ? Math.max(1, Math.floor(roundRaw)) : 1;
          const maxRounds = Number.isFinite(maxRoundsRaw)
            ? Math.max(1, Math.min(3, Math.floor(maxRoundsRaw)))
            : generationConfig.maxSocraticRounds;
          const socraticResponse = buildCategoryAwareQuestions({
            inputText,
            categoryName,
            categorySlug,
            qaContext: qaContext as SocraticContextEntry[],
            round,
            maxRounds,
          });

          sendJson(res, 200, socraticResponse);
        } catch (error) {
          sendJson(res, 500, { error: (error as Error).message });
        }
      });

      server.middlewares.use("/api/llm/generate-cards", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        try {
          const body = await readJsonBody(req);
          const inputText = String(body.inputText ?? "").trim();
          if (!inputText) {
            sendJson(res, 400, { error: "inputText is required" });
            return;
          }

          if (!requireLiveOrFallback(res)) return;

          const categoryName = String(body.categoryName ?? "General");
          const categorySlug = String(body.categorySlug ?? "general");
          const tags = Array.isArray(body.tags) ? body.tags : [];
          const socraticEnabled = Boolean(body.socraticEnabled);
          const qaContext = (Array.isArray(body.qaContext) ? body.qaContext : []) as SocraticContextEntry[];
          const editInstruction = String(body.editInstruction ?? "").trim();
          const existingCards = Array.isArray(body.existingCards) ? body.existingCards : [];
          const generationConfig = normalizeGenerationConfig(body.generationConfig);
          const overloaded = isLikelyOverloadedInput(inputText);
          const narrowed = hasNarrowingSignal(qaContext);
          if (overloaded && !narrowed) {
            sendJson(res, 200, {
              factAnchor: inputText,
              coherencePassed: false,
              coherenceWarnings: ["Input is overloaded and needs narrowing before card generation."],
              noteSpec: null,
              validatorFlags: {
                sameCoreAnswerAcrossVariants: false,
                selectedDeepAttributesPresentOnEveryCard: false,
                frontReminderMatchesSelectedAttributes: false,
                backStartsWithCoreAnswer: false,
                noUnboundNewFactsIntroduced: false,
                cardMainPromptIsSingular: false,
                categoryStyleRulesSatisfied: false,
              },
              cards: [buildRejectionCard()],
            });
            return;
          }

          const noteSpec = buildNoteSpec({
            inputText,
            categorySlug,
            categoryName,
            qaContext,
            generationConfig,
          });

          let modelCards: DraftCard[] = [];
          if (hasApiKey) {
            const parsed = await openAiJsonCall({
              apiKey: options.apiKey!,
              model,
              temperature: creativityToTemperature(generationConfig.creativityLevel),
              systemPrompt: buildGenerationSystemPrompt(categorySlug),
              userPrompt: `Input: ${inputText}\nCategoryName: ${categoryName}\nCategorySlug: ${categorySlug}\nTags: ${JSON.stringify(
                tags
              )}\nSocraticEnabled: ${socraticEnabled}\nQAContext: ${JSON.stringify(
                qaContext
              )}\nExistingCards: ${JSON.stringify(
                existingCards
              )}\nEditInstruction: ${
                editInstruction || "None"
              }\nGenerationConfig: ${JSON.stringify(
                generationConfig
              )}\nCustomInstructions: ${
                generationConfig.customInstructions || "None"
              }\nReturn noteSpec + cards.`,
            });
            modelCards = parseModelCards(parsed.cards);
            if (typeof parsed.noteSpec === "object" && parsed.noteSpec !== null) {
              const parsedNote = parsed.noteSpec as Record<string, unknown>;
              const parsedCoreAnswer = String(parsedNote.coreAnswer ?? "").trim();
              const parsedCoreExplanation = String(parsedNote.coreExplanation ?? "").trim();
              if (parsedCoreAnswer) noteSpec.coreAnswer = parsedCoreAnswer;
              if (parsedCoreExplanation) noteSpec.coreExplanation = parsedCoreExplanation;
            }
          }

          if (modelCards.length === 0) {
            modelCards = buildFallbackCards(inputText, categoryName, categorySlug, generationConfig).cards;
          }

          let finalCards = normalizeCardsForNoteSpec({
            modelCards,
            inputText,
            noteSpec,
            categorySlug,
            generationConfig,
          });
          let validatorFlags = validateCardSet({
            cards: finalCards,
            noteSpec,
            categorySlug,
            generationConfig,
          });
          if (!Object.values(validatorFlags).every(Boolean)) {
            finalCards = normalizeCardsForNoteSpec({
              modelCards: [],
              inputText,
              noteSpec,
              categorySlug,
              generationConfig,
            });
            validatorFlags = validateCardSet({
              cards: finalCards,
              noteSpec,
              categorySlug,
              generationConfig,
            });
          }

          if (!Object.values(validatorFlags).every(Boolean)) {
            sendJson(res, 200, {
              factAnchor: noteSpec.coreAnswer,
              coherencePassed: false,
              coherenceWarnings: [
                "Card set failed hard validator checks after normalization. Narrow the input and retry.",
              ],
              noteSpec,
              validatorFlags,
              cards: [buildRejectionCard()],
            });
            return;
          }

          const coherence = evaluateSingleAnchorCoherence(
            finalCards,
            noteSpec.coreAnswer,
            generationConfig.deviationAllowance
          );

          sendJson(res, 200, {
            factAnchor: noteSpec.coreAnswer,
            coherencePassed: coherence.passed,
            coherenceWarnings: coherence.warnings,
            noteSpec,
            validatorFlags,
            cards: finalCards,
          });
        } catch (error) {
          sendJson(res, 500, { error: (error as Error).message });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const extraAllowedHosts = (env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  const allowedHosts = Array.from(
    new Set([
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      ".railway.app",
      "sticky-frontend-production.up.railway.app",
      ...(env.RAILWAY_PUBLIC_DOMAIN ? [env.RAILWAY_PUBLIC_DOMAIN] : []),
      ...extraAllowedHosts,
    ])
  );

  return {
    plugins: [
      react(),
      llmLocalProxyPlugin({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        allowFallback: env.OPENAI_ALLOW_FALLBACK === "true",
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (id.includes("ts-fsrs")) return "fsrs";
            if (id.includes("@apollo/client") || id.includes("/graphql/")) return "apollo";
            if (id.includes("@mantine/")) return "mantine";
            if (id.includes("@tabler/")) return "icons";
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("react-router") ||
              id.includes("scheduler")
            ) {
              return "react";
            }
          },
        },
      },
    },
  };
});
