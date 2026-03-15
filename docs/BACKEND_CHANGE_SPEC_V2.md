# Sticky V2 — Backend Change Specification (Spec Only)

Last updated: 2026-03-14
Status: Spec only (no backend implementation in this iteration)

---

## 0. Context

Frontend V2 introduces:

- explicit `Learn` vs `Review` primary tabs
- per-rating "Next review in ..." helper text shown before user submits a rating

Current backend API (`dueInfoBits`, `nextReviewCard`, `submitReview`) is solid for core review flow, but lacks explicit pre-submit outcome previews and state-aware queue partitioning.

---

## 1. Problem Statements

## 1.1 Pre-submit rating previews are not available

Frontend currently only receives exact next due timestamp after `submitReview`.

Needed: deterministic server-calculated outcomes for each rating before submit.

## 1.2 Learn vs Review queue split is not explicit

Frontend currently cannot cleanly partition due items by FSRS state using a single query.

Needed: state-aware due query contract.

---

## 2. Proposed API Additions

## 2.1 Rating Outcome Preview (Preferred)

### New query

```graphql
query ReviewOutcomePreview($input: ReviewOutcomePreviewInput!) {
  reviewOutcomePreview(input: $input) {
    infoBitId
    cardId
    asOf
    outcomes {
      rating
      nextDueAt
      scheduledSeconds
      stateAfter
      displayText
      isEstimate
    }
  }
}
```

### Input

```graphql
input ReviewOutcomePreviewInput {
  infoBitId: ID!
  cardId: ID!
  asOf: String
}
```

### Output types

```graphql
type ReviewOutcomePreview {
  infoBitId: ID!
  cardId: ID!
  asOf: String!
  outcomes: [RatingOutcome!]!
}

type RatingOutcome {
  rating: FsrsRating!
  nextDueAt: String!
  scheduledSeconds: Int!
  stateAfter: JSON!
  displayText: String!
  isEstimate: Boolean!
}
```

Implementation note:

- Use existing FSRS engine `repeat()` against current card state at `asOf` to compute all 4 outcomes in one pass.
- This adds no behavior side effects (pure read path).

## 2.2 Alternate Shape (Back-compat Extension)

Alternative if avoiding new query:

- extend `nextReviewCard` with optional field:
  - `ratingPreviews: [RatingOutcome!]!`

This is workable but less explicit than a dedicated preview query.

---

## 3. Proposed Learn/Review Queue API

## Option A (Preferred): One query with explicit queue kind

```graphql
query DueQueue($kind: DueQueueKind!, $limit: Int) {
  dueQueue(kind: $kind, limit: $limit) {
    infoBitId
    title
    dueAt
    fsrsState
    reps
    lapses
  }
}
```

```graphql
enum DueQueueKind {
  LEARN
  REVIEW
  ALL
}
```

## Option B: Split endpoints

- `dueLearnInfoBits(limit)`
- `dueReviewInfoBits(limit)`

Option A is preferred for consistency and cache ergonomics.

---

## 3.1 Daily Engagement Heatmap API (New)

### New query

```graphql
query DailyEngagement($windowDays: Int) {
  dailyEngagement(windowDays: $windowDays) {
    date
    addedCount
    learnedCount
    reviewedCount
    totalCount
  }
}
```

### Output type

```graphql
type DailyEngagementPoint {
  date: String!         # YYYY-MM-DD UTC
  addedCount: Int!
  learnedCount: Int!
  reviewedCount: Int!
  totalCount: Int!
}
```

Contract notes:

- `windowDays` defaults to `365` and supports values up to `365`.
- `date` is normalized to UTC day boundaries.
- `addedCount` increments when an InfoBit is created.
- `learnedCount` increments when a review submission occurs for FSRS states `New`, `Learning`, or `Relearning`.
- `reviewedCount` increments when a review submission occurs for FSRS `Review` state.
- `totalCount = addedCount + learnedCount + reviewedCount`.
- Endpoint is read-only and intended for streak/consistency heatmap visualizations.

---

## 4. Response Contract Clarifications

For both preview and due queues:

- return timestamps as ISO-8601 UTC
- include `fsrsState` integer (`0/1/2/3`) or enum for frontend partitioning
- include `reps` and `lapses` where useful for queue labels

For daily engagement:

- return one point for every day in range (missing days returned as zero-count rows)
- always return non-negative integer counts
- timestamps and day bucketing must be UTC-consistent across environments

---

## 5. Backward Compatibility

- Existing operations remain unchanged:
  - `dueInfoBits`
  - `nextReviewCard`
  - `submitReview`
- New fields/queries are additive.
- Existing clients continue to function without migration.

---

## 6. Resolver-Level Implementation Notes

Expected backend touchpoints (later):

- `src/graphql/schema/index.js` (new types + query)
- `src/graphql/resolvers/reviews.resolvers.js`
  - add non-mutating preview resolver
  - add state-aware due resolver
- `src/infrastructure/fsrs/engine.js`
  - helper to return all outcomes at a timestamp

---

## 7. Test Plan for Backend Changes (Future)

Required tests:

1. `reviewOutcomePreview` returns all four ratings.
2. Preview values match corresponding `submitReview` outcome when same input/time is used.
3. Queue partition correctly separates learning/relearning from review states.
4. Backward-compat checks for existing review tests.
5. Daily engagement query returns complete day windows with accurate count aggregation.

---

## 8. Why This Matters

These additions unlock:

- deterministic "Next review in ..." labels before rating tap
- clean Learn vs Review UX parity with FSRS model semantics
- less frontend heuristics and fewer edge-case inconsistencies
- GitHub-style consistency heatmap driven by authoritative backend daily engagement counts

---

## 9. Category Doctrine Expansion (First-Class Backend Categories)

### 9.1 Goal

Frontend currently supports additional LLM-oriented "virtual" categories by mapping them onto existing backend categories for persistence.  
Backend should promote those virtual categories into first-class categories so analytics, filtering, policy, and migration behavior are explicit and stable.

### 9.2 Canonical slug set

Current seeded/system categories (existing):

- `new-word`
- `new-word-plus` (if enabled in current deployment)
- `fact`
- `technical-definition`
- `joke`

New first-class categories to add:

- `virtue-life-lesson`
- `quote-proverb-verse`
- `contrast-pair`
- `formula-rule`
- `procedure-workflow`

### 9.3 Provisioning strategy

Preferred:

1. Seed new categories as `ownerType=SYSTEM`.
2. Keep `categories` query contract unchanged; new rows appear naturally.
3. Preserve compatibility with future V1.1+ custom category APIs (`createCategory`, `updateCategory`, etc.).

### 9.4 Optional schema enhancement

If category doctrine needs server visibility for downstream features, add optional metadata fields:

```graphql
type Category {
  categoryId: ID!
  name: String!
  slug: String!
  ownerType: CategoryOwnerType!
  isActive: Boolean!
  doctrineVersion: String
  memoryArchetype: String
}
```

These fields are additive and safe for existing clients.

---

## 10. NoteSpec + DeepAttribute Persistence Contract

### 10.1 Objective

Persist normalized note structure so backend can:

- audit LLM output quality
- support validator replay
- enable future remediation/migration
- power analytics by memory archetype/deep-attribute usage

### 10.2 Shared model

```graphql
enum DeepAttribute {
  SOURCE
  CONTEXT
  SIGNIFICANCE
  USAGE
  DOMAIN
  CONTRAST
  OCCASION
  APPLICATION
}

enum ExactnessMode {
  GIST
  TERM_EXACT
  PHRASE_EXACT
  VERBATIM
}

type NoteSpec {
  coreAnswer: String!
  coreExplanation: String
  exactnessMode: ExactnessMode!
  selectedDeepAttributes: [DeepAttribute!]!
  deepAttributes: JSON! # map DeepAttribute -> string
  frontReminderText: String
  maxIndependentFactsPerNote: Int!
  memoryArchetype: String
}
```

### 10.3 API additions (additive)

#### CreateInfoBitInput extension

```graphql
input CreateInfoBitInput {
  # existing fields...
  noteSpec: JSON
}
```

Behavior:

- If `noteSpec` omitted: existing behavior unchanged.
- If present: validate and persist as authoritative normalized note metadata for the new InfoBit.

#### InfoBit output extension

```graphql
type InfoBit {
  # existing fields...
  noteSpec: JSON
}
```

### 10.4 Storage design

Preferred minimal-impact design:

- add `note_spec_json` JSONB to `info_bits`

Optional denormalized columns (for index/query efficiency):

- `note_core_answer` TEXT
- `exactness_mode` TEXT
- `memory_archetype` TEXT

Optional relational expansion (if needed later):

- `info_bit_deep_attributes` table for per-attribute querying at scale

Recommended first step: JSONB + targeted GIN index.

---

## 11. Shared Validation Contract (Frontend + Backend)

Backend should validate incoming `noteSpec` and reject malformed payloads.

### 11.1 Hard checks

1. `coreAnswer` non-empty.
2. `maxIndependentFactsPerNote >= 1`.
3. `selectedDeepAttributes` values in enum.
4. Every selected deep attribute has non-empty value in `deepAttributes`.
5. `frontReminderText` required when selected deep attributes are non-empty.
6. `exactnessMode` in enum set.

### 11.2 Optional strict review-time checks

For server-side validator replay endpoints:

- same core answer across cards
- selected deep attributes appear on every card
- back starts with core answer
- no forbidden style usage (e.g., true/false)

These checks can be exposed through an internal/admin validator endpoint first.

---

## 12. Migration: Virtual Frontend Categories -> First-Class Backend Categories

### 12.1 Current frontend mapping (pre-migration)

Virtual slug to backend fallback (example):

- `virtue-life-lesson` -> `fact`
- `quote-proverb-verse` -> `fact`
- `contrast-pair` -> `new-word`
- `formula-rule` -> `technical-definition`
- `procedure-workflow` -> `fact`

### 12.2 Migration phases

#### Phase A — Seed + dual-read

- seed first-class categories
- frontend reads real category rows when available
- continue accepting legacy mapped records

#### Phase B — Backfill existing records

Backfill strategy options:

1. Use stored slug markers from `noteSpec.categorySlug` (preferred).
2. Fallback heuristic from tags/metadata where explicit slug missing.
3. No-op for records without reliable mapping.

#### Phase C — Cutover

- frontend stops virtual mapping for environments where seeded categories exist
- policies and analytics use real category IDs

#### Phase D — Legacy cleanup

- keep backward-compatible read paths for old records
- remove migration toggles after stabilization window

---

## 13. Schema + Resolver Touchpoints

Expected backend files:

- `src/graphql/schema/index.js`
  - add enums/types for note spec contract
  - extend `CreateInfoBitInput` + `InfoBit`
  - optionally extend `Category` metadata
- `src/graphql/resolvers/infobits.resolvers.js`
  - validate and persist `noteSpec` on create/update
  - return `noteSpec` field
- `src/services/infobits/*`
  - persistence and validation helpers
- `src/db/migrations/*`
  - add `note_spec_json` and indexes
  - seed first-class categories

---

## 14. Database and Indexing Notes

### 14.1 Minimum migration

- `ALTER TABLE info_bits ADD COLUMN note_spec_json JSONB NULL;`
- add index:
  - `CREATE INDEX idx_info_bits_note_spec_json_gin ON info_bits USING GIN (note_spec_json);`

### 14.2 Optional targeted indexes

If querying by archetype/exactness is frequent:

- btree on extracted fields:
  - `( (note_spec_json->>'memoryArchetype') )`
  - `( (note_spec_json->>'exactnessMode') )`

---

## 15. Rollout and Compatibility Controls

### 15.1 Feature flags

Recommended flags:

- `ENABLE_CATEGORY_DOCTRINE_V2`
- `ENABLE_NOTE_SPEC_PERSISTENCE`
- `ENABLE_FIRST_CLASS_CATEGORY_SEEDS`

### 15.2 Backward compatibility guarantees

- Existing queries/mutations remain valid.
- Existing category IDs remain valid.
- Existing clients can ignore new fields safely.
- No required input changes for old clients.

---

## 16. Comprehensive Backend Test Matrix

### 16.1 Category expansion tests

1. `categories` includes all newly seeded system slugs.
2. Old category rows unaffected.
3. No duplicate slug collisions.
4. soft-delete/archive semantics still valid.

### 16.2 NoteSpec input/output tests

1. `createInfoBit` succeeds without `noteSpec` (legacy path).
2. `createInfoBit` persists valid `noteSpec`.
3. invalid deep-attribute payloads rejected with clear errors.
4. `infoBit` and `infoBits` return persisted `noteSpec`.

### 16.3 Migration tests

1. Backfill maps known virtual slugs to new categories correctly.
2. Records without mapping remain stable and queryable.
3. Rollback script restores pre-migration category assignments (if migration strategy requires reversible updates).

### 16.4 Validation/replay tests

1. selected deep attributes present in note spec remain internally consistent.
2. strict validator endpoint (if enabled) reports expected flags.
3. forbidden style detection catches known invalid style payloads.

### 16.5 Performance/regression tests

1. `infoBits` pagination latency remains within baseline tolerance with `note_spec_json`.
2. category-filter queries remain index-backed after seed growth.
3. no regressions in review flow (`dueQueue`, `nextReviewCard`, `submitReview`).

---

## 17. Suggested Delivery Order (Backend)

1. Add schema + DB support for `noteSpec` (read/write additive).
2. Seed first-class categories.
3. Ship dual-read frontend compatibility.
4. Run data backfill.
5. Enable strict validator/replay tooling.
6. Remove virtual mapping dependence in frontend once rollout is complete.

