import type { CardValidationFlags, GenerationPolicyConfig, NoteSpec } from "../../types";

export interface SocraticQuestion {
  id: string;
  text: string;
  options?: string[];
}

export interface SocraticQuestionsResponse {
  round?: number;
  stage?: "context" | "structure" | "disambiguation";
  needsFollowUp?: boolean;
  reason?: string;
  questions: SocraticQuestion[];
}

export interface GeneratedCardDraft {
  front: string;
  back: string;
  selectedByDefault?: boolean;
  cardType?: string;
  angle?: string;
  scopeReason?: string;
}

export interface GenerateCardsResponse {
  factAnchor?: string;
  coherencePassed?: boolean;
  coherenceWarnings?: string[];
  noteSpec?: NoteSpec;
  validatorFlags?: CardValidationFlags;
  cards: GeneratedCardDraft[];
}

export interface ExistingCardContext {
  front: string;
  back: string;
}

export interface SocraticAnswer {
  questionId: string;
  question: string;
  selectedOption?: string;
  typedAnswer?: string;
  notImportant?: boolean;
}

export type LlmGenerationConfig = GenerationPolicyConfig;

