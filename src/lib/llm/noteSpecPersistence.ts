import type { DeepAttribute, ExactnessMode, NoteSpec } from "../../types";

const DEEP_ATTRIBUTE_TO_BACKEND: Record<DeepAttribute, string> = {
  source: "SOURCE",
  context: "CONTEXT",
  significance: "SIGNIFICANCE",
  usage: "USAGE",
  domain: "DOMAIN",
  contrast: "CONTRAST",
  occasion: "OCCASION",
  application: "APPLICATION",
};

const EXACTNESS_TO_BACKEND: Record<ExactnessMode, string> = {
  gist: "GIST",
  term_exact: "TERM_EXACT",
  phrase_exact: "PHRASE_EXACT",
  verbatim: "VERBATIM",
};

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toReminder(selected: DeepAttribute[]): string {
  if (selected.length === 0) return "";
  return `Also recall: ${selected.join(" • ")}`;
}

function normalizeMaxFacts(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

export function toPersistedNoteSpec(
  noteSpec: NoteSpec | null | undefined,
  fallback: {
    categorySlug?: string;
    memoryArchetype?: string;
  } = {}
): Record<string, unknown> | undefined {
  if (!noteSpec) return undefined;

  const coreAnswer = trimOrUndefined(noteSpec.coreAnswer);
  if (!coreAnswer) return undefined;

  const deepAttributes = Object.entries(noteSpec.deepAttributes ?? {}).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const normalizedKey = DEEP_ATTRIBUTE_TO_BACKEND[key as DeepAttribute];
      const normalizedValue = trimOrUndefined(value);
      if (normalizedKey && normalizedValue) {
        acc[normalizedKey] = normalizedValue;
      }
      return acc;
    },
    {}
  );

  const selectedDeepAttributes = noteSpec.selectedDeepAttributes
    .map((attr) => DEEP_ATTRIBUTE_TO_BACKEND[attr])
    .filter((attr): attr is string => Boolean(attr && deepAttributes[attr]));

  const frontReminderText = trimOrUndefined(noteSpec.frontReminderText);

  const payload: Record<string, unknown> = {
    categorySlug: trimOrUndefined(noteSpec.categorySlug) ?? fallback.categorySlug ?? "fact",
    coreAnswer,
    exactnessMode: EXACTNESS_TO_BACKEND[noteSpec.exactnessMode] ?? "GIST",
    selectedDeepAttributes,
    deepAttributes,
    maxIndependentFactsPerNote: normalizeMaxFacts(noteSpec.maxIndependentFactsPerNote),
  };

  const coreExplanation = trimOrUndefined(noteSpec.coreExplanation);
  if (coreExplanation) payload.coreExplanation = coreExplanation;

  if (selectedDeepAttributes.length > 0) {
    payload.frontReminderText = frontReminderText ?? toReminder(noteSpec.selectedDeepAttributes);
  }

  const memoryArchetype = trimOrUndefined(fallback.memoryArchetype);
  if (memoryArchetype) payload.memoryArchetype = memoryArchetype;

  return payload;
}

