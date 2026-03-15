# Sticky — Frontend Developer API Specification

Last updated: 2026-03-14

This document is the single source of truth for any frontend developer (human or LLM) building a client against the Sticky spaced-repetition backend API. It contains everything needed to build a complete frontend without access to the backend source code.

---

## 0. North Star — Project Vision

**The goal**: Build the best personal spaced-repetition learning app for solo learners and students.

**What makes Sticky different from Anki/Quizlet:**
1. **LLM-powered card generation** — The user types or pastes what they learned. The app automatically generates multiple flashcard variations (definition, fill-in-the-blank, usage, etc.) so the user never has to manually create cards.
2. **Concept-level scheduling** — Scheduling happens per InfoBit (the thing you learned), not per card. This keeps the review queue clean while still varying how you're quizzed.
3. **Flag-and-fix workflow** — During review, users can flag cards that are wrong, low quality, or need media. This feeds a triage queue where flagged items can be edited or regenerated.
4. **Simplicity** — One input ("what did you learn?"), one action per review (rate your recall), one queue (today's due items). No deck management, no import wizards, no settings hell.

**The user journey in one sentence**: *Type what you learned → cards appear → review daily → remember forever.*

**V1 success criteria**:
- A user can go from sign-up to their first review session in under 60 seconds.
- The review loop (see card → rate → next card) feels instant and frictionless.
- LLM card generation produces usable cards at least 80% of the time.
- The app works beautifully on mobile (primary) and desktop (secondary).

**Long-term vision** (not V1, but influences architecture):
- Push/email daily review reminders
- Social sharing of InfoBits
- Import from Anki/Quizlet
- Per-card scheduling (upgrade from per-InfoBit)
- Multiple LLM providers and card templates

---

## 1. Product Overview

Sticky is a consumer flashcard app for solo learners/students.

**Core concept:**
- Users create **InfoBits** (a fact, word, concept — anything worth remembering).
- Each InfoBit has one or more **Cards** (different ways of quizzing the same knowledge — e.g. "define it", "use it in a sentence", "identify the image").
- The frontend (your job) will eventually auto-generate multiple card variations using an LLM.
- Scheduling is done **per InfoBit** (not per card). When an InfoBit is due, the backend picks one random active card to show.
- The scheduling algorithm is **FSRS** (Free Spaced Repetition Scheduler) — the same algorithm used by Anki.

**What the backend handles:**
- All auth (JWT access + refresh tokens)
- All CRUD for InfoBits, Cards, Tags, Categories, Flags
- FSRS scheduling engine (due queue, state transitions, review logging)
- Scheduler policy management (per-user/category/InfoBit parameter overrides)
- Dashboard aggregation

**What the frontend handles:**
- All UI/UX
- LLM-powered card generation (call your own LLM, then pass cards to `createInfoBit`)
- Token storage and refresh flow
- Media upload (if needed — backend accepts URLs only, no file upload API)

---

## 2. Connection Details

| Setting | Value |
|---------|-------|
| Protocol | HTTP |
| Default URL | `http://localhost:4000` |
| GraphQL endpoint | `POST /` |
| Content-Type | `application/json` |
| Auth header | `Authorization: Bearer <accessToken>` |

The API is a single GraphQL endpoint. All operations (queries and mutations) go to `POST /`.

---

## 3. Authentication Flow

### 3.1 Sign Up

```graphql
mutation SignUp($input: SignUpInput!) {
  signUp(input: $input) {
    accessToken
    refreshToken
    user { userId email timezone username }
  }
}
```

Variables:
```json
{
  "input": {
    "email": "user@example.com",
    "password": "MinimumEightChars",
    "timezone": "America/New_York",
    "username": "optional_display_name"
  }
}
```

- `email` is normalised to lowercase by the backend.
- `password` must be >= 8 characters.
- `timezone` is required (IANA format, e.g. `America/New_York`, `Europe/London`).
- `username` is required (3-30 characters, alphanumeric + `_-`, stored lowercase, must be unique).

### 3.2 Sign In

```graphql
mutation SignIn($input: SignInInput!) {
  signIn(input: $input) {
    accessToken
    refreshToken
    user { userId email timezone username }
  }
}
```

Variables:
```json
{
  "input": {
    "emailOrUsername": "user@example.com",
    "password": "MinimumEightChars",
    "deviceName": "iPhone 15 Pro"
  }
}
```

- `emailOrUsername` accepts either email address or username. Backend detects type automatically (email contains `@`, username does not).
- `deviceName` is optional, stored for session identification.

### 3.3 Token Usage

- **Access token**: short-lived (15 minutes). Send on every request as `Authorization: Bearer <token>`.
- **Refresh token**: long-lived (30 days). Use to obtain a new token pair when the access token expires.

### 3.4 Token Refresh

```graphql
mutation RefreshSession($rt: String!) {
  refreshSession(refreshToken: $rt) {
    accessToken
    refreshToken
    user { userId email }
  }
}
```

- The old refresh token is **revoked** after use (token rotation).
- Store the NEW refresh token from the response.
- If this fails with "Session has been revoked", the user must sign in again.

### 3.5 Sign Out

```graphql
mutation { signOut }                # Current session only
mutation { signOutAllSessions }     # All devices
```

### 3.6 Update Profile

```graphql
mutation UpdateMe($input: UpdateMeInput!) {
  updateMe(input: $input) { userId username timezone }
}
```

Variables: `{ "input": { "username": "new_name", "timezone": "Europe/London" } }`

Both fields are optional — omit a field to leave it unchanged.

### 3.7 Get Current User

```graphql
query { me { userId email timezone username createdAt updatedAt } }
```

Returns `null` (not an error) if not authenticated. Use this to check auth state on app launch.

---

## 4. Categories

Categories are required on every InfoBit.

```graphql
query {
  categories {
    categoryId
    name
    slug
    ownerType
    isActive
    doctrineVersion
    memoryArchetype
  }
}
```

This query is **public** (works without auth). In V2, environments can seed a first-class doctrine category set including:

- `new-word`
- `new-word-plus`
- `fact`
- `technical-definition`
- `joke`
- `virtue-life-lesson`
- `quote-proverb-verse`
- `contrast-pair`
- `formula-rule`
- `procedure-workflow`

`doctrineVersion` and `memoryArchetype` are optional metadata fields. They may be `null` until doctrine metadata rollout is enabled.

Store the `categoryId` values — you need them when creating InfoBits.

---

## 5. InfoBits — The Core Entity

### 5.1 Create InfoBit

This is the main "save something I learned" action. The frontend should:
1. Collect the title + category from the user.
2. Optionally generate card variations via LLM.
3. Send everything in one mutation.

```graphql
mutation CreateInfoBit($input: CreateInfoBitInput!) {
  createInfoBit(input: $input) {
    infoBitId
    title
    status
    noteSpec
    category { categoryId name }
    tags
    cards { cardId status frontBlocks { type text } backBlocks { type text } }
    dueAt
    createdAt
  }
}
```

Variables:
```json
{
  "input": {
    "title": "Serendipity",
    "categoryId": "<UUID from categories query>",
    "tags": ["english", "vocab"],
    "originalContent": "serendipity means finding something good by chance",
    "cards": [
      {
        "frontBlocks": [{ "type": "text", "text": "Define serendipity" }],
        "backBlocks": [{ "type": "text", "text": "Finding valuable things by chance" }]
      },
      {
        "frontBlocks": [{ "type": "text", "text": "Use serendipity in a sentence" }],
        "backBlocks": [{ "type": "text", "text": "Meeting my mentor was pure serendipity." }]
      }
    ],
    "noteSpec": {
      "coreAnswer": "Serendipity means finding valuable things by chance",
      "exactnessMode": "TERM_EXACT",
      "selectedDeepAttributes": ["CONTEXT", "SIGNIFICANCE"],
      "deepAttributes": {
        "CONTEXT": "English vocabulary",
        "SIGNIFICANCE": "Useful for describing lucky discoveries"
      },
      "frontReminderText": "Also recall: context • significance",
      "maxIndependentFactsPerNote": 1,
      "memoryArchetype": "vocab_usage"
    }
  }
}
```

**Key rules:**
- At least 1 card is required.
- `tags` is optional (array of strings). Duplicates are auto-removed by slug.
- `originalContent` is optional — store the raw text the user typed or pasted (useful for regeneration later).
- `noteSpec` is optional JSON. If present, backend validates structural fields (`coreAnswer`, exactness enum, deep-attribute consistency, max facts).
- `cards[].frontBlocks` and `backBlocks` are arrays of content blocks (see Card Block Types below).
- The InfoBit is immediately `active` and `due` for review (FSRS state = New).

### 5.2 Card Block Types

Cards use a block-based content model. Each block has a `type` and type-specific fields:

| type | Fields | Description |
|------|--------|-------------|
| `text` | `text` | Plain text content |
| `image` | `url`, `alt`, `mimeType` | Image reference (URL only) |
| `audio` | `url`, `mimeType`, `durationMs` | Audio clip reference |

V1 is text-focused. Image/audio support is schema-ready but the frontend should start with text-only cards.

### 5.3 List InfoBits (Paginated)

```graphql
query InfoBits($cursor: String, $limit: Int, $categoryId: ID, $status: InfoBitStatus) {
  infoBits(cursor: $cursor, limit: $limit, categoryId: $categoryId, status: $status) {
    edges {
      infoBitId title status dueAt createdAt noteSpec
      category { categoryId name }
      tags
      cards { cardId status frontBlocks { type text } backBlocks { type text } }
    }
    nextCursor
  }
}
```

- Default `limit` is 20.
- Default `status` filter is `active`.
- `nextCursor` is null when there are no more pages.
- To load the next page, pass the `nextCursor` value as `cursor`.
- Results are ordered newest first (`created_at DESC`).
- Enum values for `status`: `active`, `archived`, `deleted`, `mastered`.

### 5.4 Single InfoBit

```graphql
query InfoBit($id: ID!) {
  infoBit(infoBitId: $id) {
    infoBitId title status dueAt noteSpec
    category { categoryId name }
    tags
    cards { cardId status frontBlocks { type text } backBlocks { type text } }
  }
}
```

Returns `null` if not found or not owned by the user.

### 5.5 Update InfoBit

```graphql
mutation UpdateInfoBit($input: UpdateInfoBitInput!) {
  updateInfoBit(input: $input) { infoBitId title tags category { name } }
}
```

Variables:
```json
{
  "input": {
    "infoBitId": "<UUID>",
    "title": "New Title",
    "categoryId": "<new category UUID>",
    "tags": ["new-tag-1", "new-tag-2"]
  }
}
```

All fields except `infoBitId` are optional. Omit to leave unchanged. If you pass `tags`, the entire tag set is **replaced** (not merged).

### 5.6 Lifecycle Mutations

```graphql
# Single operations — return the InfoBit with its new status
mutation { archiveInfoBit(infoBitId: $id) { infoBitId status } }
mutation { deleteInfoBit(infoBitId: $id) { infoBitId status } }
mutation { markInfoBitMastered(infoBitId: $id) { infoBitId status } }

# Bulk operations — return affected count
mutation { archiveInfoBits(infoBitIds: [$id1, $id2]) { affectedCount } }
mutation { deleteInfoBits(infoBitIds: [$id1, $id2]) { affectedCount } }
```

**Status transitions allowed:**
| From | To |
|------|------|
| `active` | `archived`, `deleted`, `mastered` |
| `archived` | `active`, `deleted` |
| `mastered` | `active`, `archived` |

Invalid transitions return an error.

### 5.7 NoteSpec Contract (V2)

`noteSpec` is optional normalized note metadata attached to an InfoBit. Use it for validator replay and quality diagnostics.

Expected shape:

```json
{
  "coreAnswer": "string",
  "coreExplanation": "string (optional)",
  "exactnessMode": "GIST | TERM_EXACT | PHRASE_EXACT | VERBATIM",
  "selectedDeepAttributes": ["SOURCE", "CONTEXT"],
  "deepAttributes": { "SOURCE": "string", "CONTEXT": "string" },
  "frontReminderText": "string (required when selectedDeepAttributes is non-empty)",
  "maxIndependentFactsPerNote": 1,
  "memoryArchetype": "string (optional)"
}
```

Validation rules:

- `coreAnswer` required, non-empty.
- `exactnessMode` must be a valid enum value.
- `maxIndependentFactsPerNote` must be an integer `>= 1`.
- each selected deep attribute must have a non-empty value in `deepAttributes`.
- `frontReminderText` required when selected deep attributes are present.

---

## 6. Cards

Cards belong to an InfoBit. You can add/edit/archive/delete them independently.

### 6.1 Add Card to Existing InfoBit

```graphql
mutation AddCard($id: ID!, $input: CreateCardInput!) {
  addCard(infoBitId: $id, input: $input) {
    cardId status frontBlocks { type text } backBlocks { type text }
  }
}
```

### 6.2 Update Card Content

```graphql
mutation UpdateCard($input: UpdateCardInput!) {
  updateCardContent(input: $input) {
    cardId frontBlocks { type text } backBlocks { type text }
  }
}
```

Variables: `{ "input": { "cardId": "<UUID>", "frontBlocks": [...], "backBlocks": [...] } }`

Both `frontBlocks` and `backBlocks` are optional — omit to leave unchanged.

### 6.3 Card Lifecycle

```graphql
mutation { archiveCard(cardId: $id) { cardId status } }
mutation { deleteCard(cardId: $id) { cardId status } }
mutation { archiveCards(cardIds: [$id1, $id2]) { affectedCount } }
mutation { deleteCards(cardIds: [$id1, $id2]) { affectedCount } }
```

---

## 7. Tags

Tags are user-scoped, free-text labels. They're normalised to slugs for deduplication (e.g. "Machine Learning" and "machine-learning" are the same tag).

### 7.1 List Tags

```graphql
query { tags { tagId name slug isActive archivedAt } }
```

Returns only active tags, sorted alphabetically.

### 7.2 Attach/Detach Tags

```graphql
mutation AttachTags($id: ID!, $tags: [String!]!) {
  attachTags(infoBitId: $id, tags: $tags) { infoBitId tags }
}

mutation DetachTags($id: ID!, $tagIds: [ID!]!) {
  detachTags(infoBitId: $id, tagIds: $tagIds) { infoBitId tags }
}
```

- `attachTags` takes **tag names** (strings). Tags are auto-created if they don't exist.
- `detachTags` takes **tag IDs** (from the `tags` query). The tag itself is NOT deleted, just unlinked.

### 7.3 Tag Lifecycle

```graphql
mutation { archiveTag(tagId: $id) { tagId isActive archivedAt } }
mutation { deleteTag(tagId: $id) { tagId isActive } }
mutation { archiveTags(tagIds: [...]) { affectedCount } }
mutation { deleteTags(tagIds: [...]) { affectedCount } }
```

---

## 8. Review Flow (FSRS Spaced Repetition)

This is the core study loop. The backend handles all scheduling math.

### 8.1 Get Due InfoBits

```graphql
query { dueInfoBits(limit: 20) { infoBitId title dueAt } }
```

Returns InfoBits where the FSRS `due` date is <= now, ordered by earliest due first. This is the user's review queue.

### 8.2 Get Next Review Card

For each due InfoBit, ask the backend which card to show:

```graphql
query NextReviewCard($id: ID!) {
  nextReviewCard(infoBitId: $id) {
    infoBitId
    card { cardId frontBlocks { type text } backBlocks { type text } }
    dueAt
    allowedRatings
    ratingPreviews {
      rating
      nextDueAt
      scheduledDays
      newStability
      newDifficulty
      newState
    }
  }
}
```

- The backend picks a random active card, avoiding the last-shown card.
- `allowedRatings` is always `["AGAIN", "HARD", "GOOD", "EASY"]` for FSRS.
- **Show the front blocks first**, then reveal back blocks when the user taps "Show Answer".
- `ratingPreviews` provides pre-submit schedule estimates for each rating.

### 8.2.1 Standalone Review Schedule Preview

If you need pre-submit schedule values without fetching the full prompt again:

```graphql
query ReviewSchedulePreview($id: ID!) {
  reviewSchedulePreview(infoBitId: $id) {
    rating
    nextDueAt
    scheduledDays
  }
}
```

### 8.3 Submit Review

After the user rates their recall:

```graphql
mutation SubmitReview($input: SubmitReviewInput!) {
  submitReview(input: $input) {
    reviewEventId
    nextDueAt
    stateAfter
  }
}
```

Variables:
```json
{
  "input": {
    "infoBitId": "<UUID>",
    "cardId": "<UUID from nextReviewCard>",
    "rating": "GOOD",
    "responseMs": 3500
  }
}
```

- `rating`: one of `AGAIN`, `HARD`, `GOOD`, `EASY`.
- `responseMs`: optional, how long the user took to respond (milliseconds). Useful for analytics.
- `nextDueAt`: the ISO-8601 timestamp when this InfoBit will be due again.
- `stateAfter`: JSON blob with FSRS internals (stability, difficulty, reps, etc.) — mostly for debugging, not needed for UI.

### 8.4 Rating Guide (for UI labels)

| Rating | Meaning | Effect |
|--------|---------|--------|
| `AGAIN` | Forgot / failed completely | Card stays in learning, due again soon (minutes) |
| `HARD` | Recalled but with difficulty | Short interval |
| `GOOD` | Recalled correctly | Normal interval (recommended default) |
| `EASY` | Recalled effortlessly | Long interval |

### 8.5 Typical Review Session Flow

```
1. Query dueInfoBits → get list of due items
2. For each item:
   a. Query nextReviewCard(infoBitId) → get card to show
   b. Display front blocks
   c. User taps "Show Answer" → display back blocks
   d. User taps rating button (AGAIN/HARD/GOOD/EASY)
   e. Mutation submitReview → get nextDueAt
   f. Show brief feedback ("Next review: tomorrow" / "Next review: 3 days")
   g. Move to next item
3. When dueInfoBits is empty → "All caught up!" screen
```

### 8.6 V2 Queue and Preview Additions

For V2 `Learn`/`Review` route separation and accurate pre-submit feedback, use these additive queries:

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

Usage guidance:

- `/learn` queue source: `dueQueue(kind: LEARN)`.
- `/review` queue source: `dueQueue(kind: REVIEW)`.
- dock/header aggregate counters: `dueQueue(kind: ALL)`.
- projected rating labels before submit: `reviewOutcomePreview`.
- streak/consistency heatmap: `dailyEngagement(windowDays)`.

Backward compatibility:

- `dueInfoBits`, `nextReviewCard`, and `submitReview` remain valid.
- existing clients can continue using old queries until migrated.

---

## 9. Scheduler Policies (Advanced, Optional in V1 UI)

Users can override FSRS parameters at different scopes. This is power-user functionality.

### 9.1 Preview Effective Policy

```graphql
query Preview($id: ID!) {
  schedulerPolicyPreview(infoBitId: $id) {
    scope          # USER_DEFAULT | CATEGORY | INFOBIT
    algorithmKey   # "fsrs"
    params         # JSON: e.g. { "request_retention": 0.9 }
    sourcePolicyId # null if using system defaults
  }
}
```

### 9.2 Create/Update Policy

```graphql
mutation UpsertPolicy($input: UpsertSchedulerPolicyInput!) {
  upsertSchedulerPolicy(input: $input) {
    policyId scope algorithmKey params isActive applyMode
  }
}
```

Variables:
```json
{
  "input": {
    "scope": "USER_DEFAULT",
    "algorithmKey": "fsrs",
    "params": { "request_retention": 0.85 },
    "applyMode": "FUTURE_ONLY"
  }
}
```

For `CATEGORY` scope, include `categoryId`. For `INFOBIT` scope, include `infoBitId`.

### 9.3 Remove Policy

```graphql
mutation { removeSchedulerPolicy(policyId: $id) }
```

### 9.4 Recalculate Schedules

```graphql
mutation { recalculateSchedules(scope: USER_DEFAULT) }
mutation { recalculateSchedules(scope: CATEGORY, categoryId: $catId) }
mutation { recalculateSchedules(scope: INFOBIT, infoBitId: $ibId) }
```

Replays all review history with the current policy params. Use after changing a policy with `RECALCULATE_EXISTING` intent.

### 9.5 Generation Policies (LLM config)

Generation policy resolution is: `INFOBIT > CATEGORY > USER_DEFAULT > system default`.

Read operations:

```graphql
query GenerationPolicyPreview($id: ID!) {
  generationPolicyPreview(infoBitId: $id) {
    scope
    config
    sourcePolicyId
  }
}

query GenerationPolicyByCategory($categoryId: ID!) {
  generationPolicyByCategory(categoryId: $categoryId) {
    policyId
    scope
    categoryId
    config
    updatedAt
  }
}

query GenerationPolicyScaleMetadata {
  generationPolicyScaleMetadata {
    creativity { level label blurb implication }
    strictness { level label blurb implication }
  }
}
```

Write operations:

```graphql
mutation UpsertGenerationPolicy($input: UpsertGenerationPolicyInput!) {
  upsertGenerationPolicy(input: $input) {
    policyId
    scope
    categoryId
    infoBitId
    isActive
    config
    updatedAt
  }
}

mutation RemoveGenerationPolicy($policyId: ID!) {
  removeGenerationPolicy(policyId: $policyId)
}
```

Important doctrine rule:

- Recognition-only style `true_false` is not supported in Sticky V2.

### 9.6 Learning Preferences

```graphql
query MyLearningPreferences {
  myLearningPreferences {
    newSessionDefaultCategoryId
    defaultSocraticEnabled
    defaultTags
    updatedAt
  }
}

mutation UpdateLearningPreferences($input: UpdateLearningPreferencesInput!) {
  updateLearningPreferences(input: $input) {
    newSessionDefaultCategoryId
    defaultSocraticEnabled
    defaultTags
    updatedAt
  }
}
```

---

## 10. Flags

Flags let users mark content that needs attention.

### 10.1 Create Flag

```graphql
mutation CreateFlag($input: CreateFlagInput!) {
  createFlag(input: $input) {
    flagId entityType entityId flagType note status createdAt
  }
}
```

Variables:
```json
{
  "input": {
    "entityType": "INFOBIT",
    "entityId": "<InfoBit/Card/Tag UUID>",
    "flagType": "NEEDS_EDIT",
    "note": "Spelling mistake in definition"
  }
}
```

Entity types: `INFOBIT`, `CARD`, `TAG`
Flag types: `NEEDS_EDIT`, `NEEDS_REGENERATE`, `NEEDS_MEDIA`, `LOW_QUALITY`, `OTHER`

### 10.2 List Flags

```graphql
query { flags(status: OPEN) { flagId entityType entityId flagType note status createdAt } }
query { flags(entityType: CARD) { flagId flagType status } }
```

Both filter parameters are optional.

### 10.3 Resolve Flag

```graphql
mutation { resolveFlag(flagId: $id) { flagId status resolvedAt } }
```

---

## 11. Dashboard

A single composite query for the home screen:

```graphql
query Dashboard {
  dashboardInfoBits(limitPerTag: 25, tagLimit: 20) {
    flaggedInfoBits { infoBitId title status }
    flaggedCards { cardId infoBitId frontBlocks { type text } }
    sectionsByTag {
      tag { tagId name }
      infoBits { infoBitId title dueAt cards { cardId } }
    }
  }
}
```

- `flaggedInfoBits`: InfoBits with open flags (need attention)
- `flaggedCards`: Cards with open flags
- `sectionsByTag`: InfoBits grouped by tag (for a "browse by topic" view)

## 11.1 Health + Feature Flags (V2)

The health query may include runtime feature flags in non-production environments:

```graphql
query {
  health {
    ok
    service
    featureFlags
  }
}
```

- `featureFlags` is JSON and may be `null` in production.
- current relevant flag: `noteSpecValidator`.

## 11.2 NoteSpec Validator (Flag-gated)

```graphql
query ValidateNoteSpec($infoBitId: ID!) {
  validateNoteSpec(infoBitId: $infoBitId) {
    isValid
    checks {
      name
      passed
      message
    }
  }
}
```

Expected check names:

- `CORE_ANSWER_CONSISTENT`
- `DEEP_ATTRIBUTES_PRESENT`
- `BACK_STARTS_WITH_CORE`
- `NO_TRUE_FALSE_STYLE`
- `FRONT_HAS_REMINDER`
- `MAX_FACTS_RESPECTED`

This endpoint is intended for warning/diagnostic UX. Frontend should never block saves if the endpoint is disabled or unavailable.

---

## 12. Error Handling

All errors follow the standard GraphQL error format:

```json
{
  "errors": [
    {
      "message": "Authentication required",
      "extensions": { "code": "BAD_REQUEST" }
    }
  ],
  "data": null
}
```

### Common error messages

| Message | Cause | Action |
|---------|-------|--------|
| `Authentication required` | Missing or invalid access token | Redirect to login or attempt token refresh |
| `Invalid credentials` | Wrong email/password on signIn | Show login error |
| `Email is already registered` | Duplicate signUp | Show "already registered" message |
| `Password must be at least 8 characters long` | Short password | Show validation error |
| `InfoBit not found` | Wrong ID or not owned by user | Show 404 |
| `Category not found or not accessible` | Invalid categoryId | Reload categories |
| `At least one card is required` | Empty cards array in createInfoBit | Validate before sending |
| `Cannot transition from 'X' to 'Y'` | Invalid status change | Check allowed transitions |
| `Session has been revoked` | Reused refresh token | Force re-login |
| `Invalid or expired refresh token` | Expired refresh token | Force re-login |

### Token expiry strategy

1. On every GraphQL response, check for `Authentication required` error.
2. If received, attempt `refreshSession` with stored refresh token.
3. If refresh succeeds, retry the original request with the new access token.
4. If refresh fails, redirect to login screen.

---

## 13. Complete Type Reference

### Enums

```
InfoBitStatus: active | archived | deleted | mastered
FsrsRating: AGAIN | HARD | GOOD | EASY
DueQueueKind: LEARN | REVIEW | ALL
SchedulerScope: USER_DEFAULT | CATEGORY | INFOBIT
PolicyApplyMode: FUTURE_ONLY | RECALCULATE_EXISTING
FlagEntityType: INFOBIT | CARD | TAG
FlagType: NEEDS_EDIT | NEEDS_REGENERATE | NEEDS_MEDIA | LOW_QUALITY | OTHER
FlagStatus: OPEN | RESOLVED
GenerationPolicyScope: USER_DEFAULT | CATEGORY | INFOBIT
DeepAttribute: SOURCE | CONTEXT | SIGNIFICANCE | USAGE | DOMAIN | CONTRAST | OCCASION | APPLICATION
ExactnessMode: GIST | TERM_EXACT | PHRASE_EXACT | VERBATIM
```

### Date format

All date fields are **ISO-8601 strings** (e.g. `"2026-02-12T14:30:00.000Z"`). Parse them on the frontend with `new Date(dateString)`.

### ID format

All IDs are **UUIDs** (e.g. `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`).

---

## 14. Frontend Way of Work

### 14.1 Recommended tech stack

The backend is tech-agnostic. Recommended options:
- **React Native** (mobile-first, cross-platform)
- **Next.js** (web-first)
- **Expo** (React Native with less config)

For GraphQL client, use **Apollo Client** or **urql**.

### 14.2 Suggested screen map

| Screen | Primary queries/mutations |
|--------|--------------------------|
| Login / Sign Up | `signIn`, `signUp` |
| Home / Dashboard | `dashboardInfoBits`, `dueQueue(kind: ALL)`, `dailyEngagement` |
| Create InfoBit | `categories`, `createInfoBit` |
| InfoBit Detail | `infoBit`, `updateInfoBit`, `addCard`, `updateCardContent` |
| InfoBit List | `infoBits` (paginated) |
| Learn Session | `dueQueue(kind: LEARN)`, `nextReviewCard`, `reviewOutcomePreview`, `submitReview` |
| Review Session | `dueQueue(kind: REVIEW)`, `nextReviewCard`, `reviewOutcomePreview`, `submitReview` |
| Tags Browser | `tags`, `infoBits(categoryId, status)` |
| Flags / Triage | `flags`, `resolveFlag` |
| Settings | `me`, `updateMe`, `schedulerPolicyPreview`, `upsertSchedulerPolicy`, `myLearningPreferences`, `updateLearningPreferences` |
| LLM Config | `generationPolicyPreview`, `generationPolicyByCategory`, `upsertGenerationPolicy`, `generationPolicyScaleMetadata` |

### 14.3 LLM card generation pattern

The backend has no LLM integration. The frontend should:

1. Collect the "thing to learn" from the user (title + raw content).
2. Call your LLM (client-side or via your own API) to generate card variations.
3. Map LLM output into `CreateCardInput` blocks.
4. Send everything via `createInfoBit` in one call.

Example LLM prompt pattern:
```
Given this fact: "Serendipity means finding valuable things by chance"
Generate 3 flashcard variations:
1. Definition quiz (front: "Define X", back: definition)
2. Fill-in-the-blank (front: "_____ means finding valuable things by chance", back: word)
3. Usage example (front: "Use X in a sentence", back: example sentence)
Return as JSON array of { front: string, back: string }
```

Then map to:
```javascript
cards = llmOutput.map(card => ({
  frontBlocks: [{ type: "text", text: card.front }],
  backBlocks: [{ type: "text", text: card.back }]
}));
```

### 14.4 Development workflow — how to start

1. Start the backend: `cd spaced-rep-api && npm run dev` (runs on port 4000)
2. Open Apollo Sandbox at `http://localhost:4000` to test queries manually
3. Build your frontend pointing at `http://localhost:4000`
4. All mutations return the updated object — use the response to update your local state/cache

### 14.5 Key gotchas

- **No CORS issues in dev**: The backend allows all origins in development mode.
- **Timezone is required**: Collect it during sign-up (auto-detect with `Intl.DateTimeFormat().resolvedOptions().timeZone`).
- **Tags are strings on input, IDs on detach**: `attachTags` takes tag names, `detachTags` takes tag IDs. Query `tags` to get the ID-to-name mapping.
- **Pagination is cursor-based**: Don't use offset/page numbers. Pass `nextCursor` from the previous response.
- **InfoBit status defaults to `active`**: The `infoBits` query only returns active items unless you pass `status: archived` etc.
- **Reviews modify FSRS state permanently**: There's no "undo review". The `stateAfter` in the response shows the new scheduling state.
- **`me` returns null, not an error, when unauthenticated**: Use this to check login state.

---

## 15. API Not Yet Available (Known Gaps for V1)

These are not implemented in the backend yet. Plan your UI accordingly:

| Feature | Status | Workaround |
|---------|--------|------------|
| User-created categories | Not implemented | Use system categories returned by `categories` (seeded set may expand by environment) |
| Password change/reset | Not implemented | User must re-register |
| Account deletion | Not implemented | N/A |
| Media file upload | Not implemented | Host media externally, pass URLs |
| Activity event feed | Events are recorded but no read query | N/A |

---

## 16. Complete Query/Mutation Quick Reference

### Queries (read operations)

```
health                                          → Health!          (public)
me                                              → User             (auth-aware, null if not authed)
categories                                      → [Category!]!     (public)
infoBits(cursor, limit, categoryId, status)     → InfoBitConnection! (auth required)
infoBit(infoBitId)                              → InfoBit           (auth required)
tags                                            → [Tag!]!          (auth required)
dueInfoBits(cursor, limit)                      → [DueInfoBit!]!   (auth required)
dueQueue(kind, limit)                           → [DueInfoBit!]!   (auth required)
nextReviewCard(infoBitId)                       → ReviewPrompt!    (auth required)
reviewSchedulePreview(infoBitId)                → [RatingPreview!]! (auth required)
reviewOutcomePreview(input)                     → ReviewOutcomePreview! (auth required)
dailyEngagement(windowDays)                     → [DailyEngagementPoint!]! (auth required)
schedulerPolicyPreview(infoBitId)               → ResolvedSchedulerPolicy! (auth required)
flags(status, entityType)                       → [Flag!]!         (auth required)
dashboardInfoBits(limitPerTag, tagLimit)        → DashboardInfoBits! (auth required)
generationPolicyScaleMetadata                   → GenerationPolicyScaleMetadata! (public)
generationPolicyPreview(infoBitId)              → ResolvedGenerationPolicy! (auth required)
generationPolicyByCategory(categoryId)          → GenerationPolicy (auth required, nullable)
myLearningPreferences                           → UserLearningPreferences! (auth required)
validateNoteSpec(infoBitId)                     → NoteSpecValidationResult! (auth required, flag-gated)
```

### Mutations (write operations)

```
# Auth
signUp(input)                     → AuthPayload!
signIn(input)                     → AuthPayload!
signOut                           → Boolean!
signOutAllSessions                → Boolean!
refreshSession(refreshToken)      → AuthPayload!
updateMe(input)                   → User!

# InfoBits
createInfoBit(input)              → InfoBit!
updateInfoBit(input)              → InfoBit!
archiveInfoBit(infoBitId)         → InfoBit!
deleteInfoBit(infoBitId)          → InfoBit!
markInfoBitMastered(infoBitId)    → InfoBit!
archiveInfoBits(infoBitIds)       → BulkInfoBitMutationResult!
deleteInfoBits(infoBitIds)        → BulkInfoBitMutationResult!

# Cards
addCard(infoBitId, input)         → CardContent!
updateCardContent(input)          → CardContent!
archiveCard(cardId)               → CardContent!
deleteCard(cardId)                → CardContent!
archiveCards(cardIds)             → BulkCardMutationResult!
deleteCards(cardIds)              → BulkCardMutationResult!

# Tags
attachTags(infoBitId, tags)       → InfoBit!
detachTags(infoBitId, tagIds)     → InfoBit!
archiveTag(tagId)                 → Tag!
deleteTag(tagId)                  → Tag!
archiveTags(tagIds)               → BulkTagMutationResult!
deleteTags(tagIds)                → BulkTagMutationResult!

# Reviews
submitReview(input)               → ReviewResult!

# Scheduling
upsertSchedulerPolicy(input)      → SchedulerPolicy!
removeSchedulerPolicy(policyId)   → Boolean!
recalculateSchedules(scope, ...)  → Boolean!

# Generation + learning defaults
upsertGenerationPolicy(input)      → GenerationPolicy!
removeGenerationPolicy(policyId)   → Boolean!
updateLearningPreferences(input)   → UserLearningPreferences!

# Flags
createFlag(input)                 → Flag!
resolveFlag(flagId)               → Flag!
```

---

## 17. Testing the Backend

To verify the backend is running correctly:

```bash
cd spaced-rep-api
npm run dev          # Starts server on port 4000
```

In a separate terminal:
```bash
curl -s http://localhost:4000 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ health { ok service featureFlags } }"}' | jq
```

Expected (non-production): `featureFlags` may be present.
Expected (production): `featureFlags` may be `null`.

The backend has 207 automated integration tests:
```bash
cd spaced-rep-api
npm test
```

---

## 18. Way of Work — Modular Development Lifecycle

This section defines how to build the frontend. Follow this process exactly — it's what was used to build the backend and it keeps things clean, testable, and debuggable.

### 18.1 The core loop

```
For each chunk:
  1. LIST the functions/components to build (write them out before coding)
  2. BUILD each function one at a time
  3. TEST each function before moving to the next
  4. VERIFY the full chunk works end-to-end
  5. DOCUMENT decisions made and errors encountered
  6. Move to the next chunk
```

**Never move to the next chunk until all tests in the current chunk pass.**

### 18.2 Build chunks (recommended order)

Build the frontend in this order. Each chunk is self-contained and testable independently.

#### Chunk 1 — Project scaffold + GraphQL client

Functions to build:
- [ ] Project init (framework, folder structure, linting, formatting)
- [ ] GraphQL client setup (Apollo Client or urql)
- [ ] Environment config (`API_URL` pointing at backend)
- [ ] Health check query (call `health`, confirm backend is reachable)

**Test**: Run the app, see "Backend connected: ok" in console or on screen.

#### Chunk 2 — Auth flow

Functions to build:
- [ ] `signUp` mutation hook/function
- [ ] `signIn` mutation hook/function
- [ ] Token storage (secure storage on mobile, httpOnly equivalent on web)
- [ ] Auth context/provider (track logged-in state)
- [ ] `refreshSession` logic (auto-refresh on 401)
- [ ] `signOut` mutation hook/function
- [ ] Protected route wrapper (redirect to login if not authed)
- [ ] Login screen UI
- [ ] Sign-up screen UI

**Test**: Sign up → token stored → navigate to protected screen → sign out → redirected to login → sign in again → works.

#### Chunk 3 — Categories + Create InfoBit

Functions to build:
- [ ] `categories` query hook (fetch on app load, cache locally)
- [ ] `createInfoBit` mutation hook
- [ ] Create InfoBit screen (title input, category picker, tag input, card editor)
- [ ] Card block editor (text block for V1)
- [ ] LLM card generation integration (optional — can hardcode test cards first)

**Test**: Create an InfoBit with 2 cards → see it appear in the database via Apollo Sandbox `infoBits` query.

#### Chunk 4 — InfoBit list + detail

Functions to build:
- [ ] `infoBits` paginated query hook (with cursor handling)
- [ ] InfoBit list screen (infinite scroll or "Load more")
- [ ] `infoBit` single query hook
- [ ] InfoBit detail screen (show title, category, tags, cards)
- [ ] `updateInfoBit` mutation hook
- [ ] Edit InfoBit flow
- [ ] Archive / delete / master actions

**Test**: Create 25+ InfoBits → paginate through list → tap one → see detail → edit title → archive it → confirm it disappears from active list.

#### Chunk 5 — Review session

Functions to build:
- [ ] `dueInfoBits` query hook
- [ ] `nextReviewCard` query hook
- [ ] `submitReview` mutation hook
- [ ] Review session screen (show front → reveal back → rate)
- [ ] Session complete screen ("All caught up!")
- [ ] Rating buttons (AGAIN / HARD / GOOD / EASY with labels)
- [ ] Response time tracking (measure ms between card show and rating tap)

**Test**: Create an InfoBit → it should be immediately due → start review → rate GOOD → check `nextDueAt` is in the future → no more due items → "All caught up".

#### Chunk 6 — Tags + Dashboard

Functions to build:
- [ ] `tags` query hook
- [ ] Tag browser screen
- [ ] `attachTags` / `detachTags` mutation hooks
- [ ] `dashboardInfoBits` query hook
- [ ] Dashboard / home screen (flagged items, sections by tag, due count)

**Test**: Create InfoBits with different tags → dashboard shows them grouped → tag browser shows all tags.

#### Chunk 7 — Flags + Triage

Functions to build:
- [ ] `createFlag` mutation hook
- [ ] Flag button on review screen and detail screen
- [ ] `flags` query hook
- [ ] Flags list / triage screen
- [ ] `resolveFlag` mutation hook

**Test**: During review, flag a card as NEEDS_EDIT → see it in flags list → resolve it → gone from list.

#### Chunk 8 — Cards management

Functions to build:
- [ ] `addCard` mutation hook
- [ ] `updateCardContent` mutation hook
- [ ] Card editor component (add/edit/archive/delete cards within InfoBit detail)
- [ ] Bulk card operations

**Test**: Open InfoBit detail → add a new card → edit its content → archive it → one fewer card displayed.

#### Chunk 9 — Settings + Polish

Functions to build:
- [ ] `updateMe` mutation hook
- [ ] Settings screen (username, timezone)
- [ ] Scheduler policy UI (advanced, optional)
- [ ] Loading states, error states, empty states for all screens
- [ ] Offline handling / retry logic

**Test**: Full end-to-end: sign up → create InfoBit → review it → flag a card → edit it → resolve flag → change settings.

### 18.3 Function-level development rules

1. **One function at a time.** Don't scaffold 5 hooks and then test them all at once. Build hook → test hook → next hook.
2. **Test against the real backend.** Don't mock the GraphQL API during development. Run the backend locally and hit it.
3. **Each function should be a single file or clearly isolated export.** If a function grows past ~100 lines, split it.
4. **Name files by what they do, not what they are.** `useCreateInfoBit.ts` not `mutation3.ts`.
5. **Shared utilities go in a `lib/` or `utils/` folder.** GraphQL client config, token helpers, date formatting — all shared.

### 18.4 Testing strategy

- **Unit tests** for pure logic (token refresh, date formatting, cursor pagination helpers).
- **Integration tests** for GraphQL hooks (mock the network layer, verify the hook returns correct data shapes).
- **E2E tests** (optional but recommended for the review flow) using Playwright or Cypress hitting the real backend.
- Run `npm test` (or equivalent) and confirm ALL tests pass before marking a chunk complete.

---

## 19. Decision Log + Error Journal

Maintain two living documents in your frontend project. These are critical for LLM context continuity across sessions and for any developer picking up the project later.

### 19.1 Decision Log (`docs/DECISION_LOG.md`)

Record every non-trivial technical or product decision. Format:

```markdown
# Frontend Decision Log

## 2026-02-12 — State management choice
**Decision**: Use React Context + useReducer instead of Redux/Zustand.
**Why**: App state is simple (auth, current review session, cache). No need for external state library in V1. Can upgrade later if needed.

## 2026-02-12 — Token storage
**Decision**: Store tokens in SecureStore (Expo) / localStorage (web) with httpOnly cookie fallback.
**Why**: Mobile-first means SecureStore is the primary path. Web fallback is acceptable for V1 since there's no sensitive PII beyond email.

## [date] — [short title]
**Decision**: [what you chose]
**Why**: [reasoning, alternatives considered, tradeoffs]
```

Rules:
- **Log every choice** where there were 2+ reasonable options.
- **Never delete entries.** If you reverse a decision, add a new entry referencing the old one.
- **Keep it chronological.** Newest at the bottom.

### 19.2 Error Journal (`docs/ERROR_JOURNAL.md`)

Record every non-trivial bug or error encountered during development, how it was diagnosed, and how it was fixed. Format:

```markdown
# Frontend Error Journal

## 2026-02-12 — Apollo Client CSRF error on first request
**Symptom**: Every GraphQL request returned "This operation has been blocked as a potential CSRF".
**Cause**: Missing `apollo-require-preflight` header. The backend has CSRF prevention enabled.
**Fix**: Added default header `apollo-require-preflight: true` to Apollo Client httpLink config.
**Lesson**: Always check backend CSRF settings when setting up a new GraphQL client.

## [date] — [short description]
**Symptom**: [what you saw]
**Cause**: [root cause]
**Fix**: [what you changed]
**Lesson**: [what to remember for next time]
```

Rules:
- **Log errors that took more than 5 minutes to diagnose.** Don't log typos.
- **Include the fix.** A symptom without a fix is useless.
- **Include the lesson.** This is what prevents the same mistake twice.

### 19.3 Why these documents matter

These two files serve three purposes:
1. **LLM context**: When starting a new LLM session, include `DECISION_LOG.md` and `ERROR_JOURNAL.md` as context. This prevents the LLM from re-debating settled decisions or re-introducing previously fixed bugs.
2. **Human onboarding**: Any developer joining the project can read these two files and understand not just *what* was built, but *why* it was built that way.
3. **Audit trail**: When something breaks months later, the error journal tells you if it's a known issue.

### 19.4 LLM session management

When working with an LLM on this frontend project:

1. **Always include these files as context at session start:**
   - `docs/FRONTEND_API_SPEC.md` (this file — the API contract)
   - `docs/DECISION_LOG.md` (settled decisions)
   - `docs/ERROR_JOURNAL.md` (known pitfalls)

2. **At the end of each session**, ask the LLM to:
   - Update `DECISION_LOG.md` with any decisions made during the session.
   - Update `ERROR_JOURNAL.md` with any errors encountered and fixed.

3. **Chunk tracking**: At the top of your `DECISION_LOG.md`, maintain a chunk completion tracker:
   ```markdown
   ## Chunk Status
   - [x] Chunk 1 — Project scaffold + GraphQL client
   - [x] Chunk 2 — Auth flow
   - [ ] Chunk 3 — Categories + Create InfoBit (in progress)
   - [ ] Chunk 4 — InfoBit list + detail
   - [ ] Chunk 5 — Review session
   - [ ] Chunk 6 — Tags + Dashboard
   - [ ] Chunk 7 — Flags + Triage
   - [ ] Chunk 8 — Cards management
   - [ ] Chunk 9 — Settings + Polish
   ```

4. **Do not skip ahead.** Complete chunks in order. The order is designed so each chunk builds on the previous one.

---

*This document should be included as context for any LLM session building the frontend. It replaces the need to read backend source code.*
