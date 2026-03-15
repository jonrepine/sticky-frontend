// ── Enums ──

export type InfoBitStatus = "active" | "archived" | "deleted" | "mastered";
export type FsrsRating = "AGAIN" | "HARD" | "GOOD" | "EASY";
export type SchedulerScope = "USER_DEFAULT" | "CATEGORY" | "INFOBIT";
export type PolicyApplyMode = "FUTURE_ONLY" | "RECALCULATE_EXISTING";
export type FlagEntityType = "INFOBIT" | "CARD" | "TAG";
export type FlagType =
  | "NEEDS_EDIT"
  | "NEEDS_REGENERATE"
  | "NEEDS_MEDIA"
  | "LOW_QUALITY"
  | "OTHER";
export type FlagStatus = "OPEN" | "RESOLVED";

// ── Auth ──

export interface User {
  userId: string;
  email: string;
  timezone: string;
  username: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ── Categories ──

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  ownerType: string;
  isActive: boolean;
  doctrineVersion?: string | null;
  memoryArchetype?: string | null;
}

// ── Content blocks ──

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ImageBlock {
  type: "image";
  url: string;
  alt?: string;
  mimeType?: string;
}

export interface AudioBlock {
  type: "audio";
  url: string;
  mimeType?: string;
  durationMs?: number;
}

export type ContentBlock = TextBlock | ImageBlock | AudioBlock;

// ── Cards ──

export interface Card {
  cardId: string;
  status: string;
  frontBlocks: ContentBlock[];
  backBlocks: ContentBlock[];
}

// ── InfoBits ──

export interface InfoBit {
  infoBitId: string;
  title: string;
  status: InfoBitStatus;
  dueAt: string | null;
  createdAt: string;
  category: Pick<Category, "categoryId" | "name">;
  tags: string[];
  cards: Card[];
  noteSpec?: NoteSpec | null;
}

export interface InfoBitConnection {
  edges: InfoBit[];
  nextCursor: string | null;
}

// ── Tags ──

export interface Tag {
  tagId: string;
  name: string;
  slug: string;
  isActive: boolean;
  archivedAt: string | null;
}

// ── Review ──

export type DueQueueKind = "LEARN" | "REVIEW" | "ALL";

export interface DueInfoBit {
  infoBitId: string;
  title: string;
  dueAt: string;
  fsrsState?: number;
  reps?: number;
  lapses?: number;
}

export interface DailyEngagementPoint {
  date: string;
  addedCount: number;
  learnedCount: number;
  reviewedCount: number;
  totalCount: number;
}

export interface FeatureFlags {
  noteSpecValidator?: boolean;
}

export interface HealthStatus {
  ok: boolean;
  service: string;
  featureFlags?: FeatureFlags | null;
}

export type DeepAttribute =
  | "source"
  | "context"
  | "significance"
  | "usage"
  | "domain"
  | "contrast"
  | "occasion"
  | "application";

export type ExactnessMode = "gist" | "term_exact" | "phrase_exact" | "verbatim";

export interface NoteSpec {
  categorySlug: string;
  categoryId?: string;
  coreAnswer: string;
  coreExplanation?: string;
  exactnessMode: ExactnessMode;
  deepAttributes: Partial<Record<DeepAttribute, string>>;
  selectedDeepAttributes: DeepAttribute[];
  frontReminderText?: string;
  maxIndependentFactsPerNote: number;
}

export interface CardValidationFlags {
  sameCoreAnswerAcrossVariants: boolean;
  selectedDeepAttributesPresentOnEveryCard: boolean;
  frontReminderMatchesSelectedAttributes: boolean;
  backStartsWithCoreAnswer: boolean;
  noUnboundNewFactsIntroduced: boolean;
  cardMainPromptIsSingular: boolean;
  categoryStyleRulesSatisfied: boolean;
}

export type NoteSpecValidationCheckName =
  | "CORE_ANSWER_CONSISTENT"
  | "DEEP_ATTRIBUTES_PRESENT"
  | "BACK_STARTS_WITH_CORE"
  | "NO_TRUE_FALSE_STYLE"
  | "FRONT_HAS_REMINDER"
  | "MAX_FACTS_RESPECTED";

export interface NoteSpecValidationCheck {
  name: NoteSpecValidationCheckName | string;
  passed: boolean;
  message: string;
}

export interface NoteSpecValidationResult {
  isValid: boolean;
  checks: NoteSpecValidationCheck[];
}

export interface ReviewPrompt {
  infoBitId: string;
  card: Card;
  dueAt: string;
  allowedRatings: FsrsRating[];
  ratingPreviews: RatingPreview[];
}

export interface ReviewResult {
  reviewEventId: string;
  nextDueAt: string;
  stateAfter: unknown;
}

export interface ReviewOutcome {
  rating: FsrsRating;
  nextDueAt: string;
  scheduledSeconds: number;
  stateAfter: unknown;
  displayText: string;
  isEstimate: boolean;
}

export interface ReviewOutcomePreviewResult {
  infoBitId: string;
  cardId: string;
  asOf: string;
  outcomes: ReviewOutcome[];
}

export interface RatingPreview {
  rating: FsrsRating;
  nextDueAt: string;
  scheduledDays: number;
  newStability: number;
  newDifficulty: number;
  newState: number;
}

// ── Flags ──

export interface Flag {
  flagId: string;
  entityType: FlagEntityType;
  entityId: string;
  flagType: FlagType;
  note: string | null;
  status: FlagStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

// ── Dashboard ──

export interface DashboardData {
  flaggedInfoBits: Pick<InfoBit, "infoBitId" | "title" | "status">[];
  flaggedCards: (Pick<Card, "cardId" | "frontBlocks"> & {
    infoBitId: string;
  })[];
  sectionsByTag: {
    tag: Pick<Tag, "tagId" | "name">;
    infoBits: Pick<InfoBit, "infoBitId" | "title" | "dueAt" | "cards">[];
  }[];
}

// ── Scheduler Policy ──

export interface SchedulerPolicy {
  policyId: string;
  scope: SchedulerScope;
  algorithmKey: string;
  params: Record<string, unknown>;
  isActive: boolean;
  applyMode: PolicyApplyMode;
}

export interface ResolvedSchedulerPolicy {
  scope: SchedulerScope;
  algorithmKey: string;
  params: Record<string, unknown>;
  sourcePolicyId: string | null;
}

// ── Generation Policy + Learning Preferences ──

export type GenerationPolicyScope = "USER_DEFAULT" | "CATEGORY" | "INFOBIT";

export type GenerationCardStyle =
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

export interface GenerationPolicyConfig {
  targetCardCount?: number;
  requiredCardStyles?: GenerationCardStyle[];
  creativityLevel?: number;
  deviationAllowance?: number;
  sourcePreference?: string[];
  socraticModeDefault?: boolean;
  maxSocraticRounds?: number;
  includeClozeCard?: boolean;
  customInstructions?: string;
  memoryArchetype?: string;
  exactnessMode?: ExactnessMode;
  deepAttributesSupported?: DeepAttribute[];
  deepAttributesDefaultPrompting?: Partial<Record<DeepAttribute, boolean>>;
  maxIndependentFactsPerNote?: number;
  socraticStages?: {
    round1?: string;
    round2?: string;
    round3?: string;
  };
}

export interface GenerationPolicy {
  policyId: string;
  scope: GenerationPolicyScope;
  categoryId: string | null;
  infoBitId: string | null;
  isActive: boolean;
  config: GenerationPolicyConfig;
  updatedAt: string;
}

export interface ResolvedGenerationPolicy {
  scope: GenerationPolicyScope;
  config: GenerationPolicyConfig;
  sourcePolicyId: string | null;
}

export interface UserLearningPreferences {
  newSessionDefaultCategoryId: string | null;
  defaultSocraticEnabled: boolean;
  defaultTags: string[];
  updatedAt: string;
}
