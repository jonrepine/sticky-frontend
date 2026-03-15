# FSRS Algorithm Reference for This Project

Last updated: 2026-02-12

Source: [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (TypeScript implementation of FSRS v6)

## What is FSRS

FSRS (Free Spaced Repetition Scheduler) is an open-source spaced repetition algorithm created by the [Open Spaced Repetition](https://github.com/open-spaced-repetition) community. It determines when a user should next review a piece of knowledge based on their history of remembering or forgetting it.

In this project, FSRS runs at the **InfoBit level** (not per card). Each InfoBit has one FSRS schedule state. At review time, a random active card is presented, but the scheduling math applies to the InfoBit as a whole.

## Package we use

```bash
npm install ts-fsrs
```

- Package: `ts-fsrs` (latest v4.x+, implements FSRS v6 algorithm)
- Docs: https://open-spaced-repetition.github.io/ts-fsrs/
- Source: https://github.com/open-spaced-repetition/ts-fsrs

## Core concepts

### Card state machine

Every schedulable item (in our case, an InfoBit) moves through 4 states:

```
New (0) ──> Learning (1) ──> Review (2)
                 ^                │
                 │                v
                 └── Relearning (3)
```

- **New (0):** Never reviewed. First review transitions to Learning.
- **Learning (1):** Recently introduced. Short intervals (minutes/hours). Multiple steps before graduating to Review.
- **Review (2):** Graduated. Intervals measured in days/weeks/months.
- **Relearning (3):** Was in Review but user pressed "Again" (forgot). Goes through short-interval steps again before returning to Review.

### Rating scale

Users rate each review with one of 4 grades:

| Rating | Value | Meaning |
|--------|-------|---------|
| Again | 1 | Forgot completely, reset to relearning |
| Hard | 2 | Remembered with significant difficulty |
| Good | 3 | Remembered with moderate effort |
| Easy | 4 | Remembered effortlessly |

### How a review works (the `repeat` function)

```javascript
const { fsrs, createEmptyCard, Rating } = require('ts-fsrs');

// 1. Create FSRS instance with parameters
const f = fsrs(params);

// 2. Get current card state (from DB or createEmptyCard for new)
const card = createEmptyCard(new Date());

// 3. Call repeat() -- returns outcomes for ALL 4 ratings
const results = f.repeat(card, new Date());

// 4. User selects a rating (e.g., Good)
const { card: newCard, log: reviewLog } = results[Rating.Good];

// newCard = updated card state to save back to DB
// reviewLog = immutable log entry to store for audit/replay
```

Alternatively, use `f.next()` for a single rating:

```javascript
const result = f.next(card, new Date(), Rating.Good);
// result = { card: Card, log: ReviewLog }
```

## ts-fsrs Card type (what we persist as FSRS state)

```typescript
type Card = {
  due: Date;              // When next review is due
  stability: number;      // How well the knowledge is retained (higher = stronger memory)
  difficulty: number;     // Inherent difficulty of the content (0-10 scale)
  elapsed_days: number;   // Days since last review
  scheduled_days: number; // Days between this review and the next
  learning_steps: number; // Current step in learning/relearning progression
  reps: number;           // Total review count
  lapses: number;         // Times the user forgot (pressed Again from Review state)
  state: State;           // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review?: Date;     // Most recent review date
};
```

### Mapping to our `fsrs_card_states` table

| ts-fsrs Card field | Our DB column | Type | Notes |
|-------------------|---------------|------|-------|
| `due` | `due` | DATE | When InfoBit is next due |
| `stability` | `stability` | FLOAT | |
| `difficulty` | `difficulty` | FLOAT | |
| `elapsed_days` | `elapsed_days` | FLOAT | |
| `scheduled_days` | `scheduled_days` | FLOAT | |
| `learning_steps` | **MISSING** | INTEGER | **Must add this column** |
| `reps` | `reps` | INTEGER | |
| `lapses` | `lapses` | INTEGER | |
| `state` | `state` | INTEGER | 0/1/2/3 |
| `last_review` | `last_review` | DATE | Nullable |

**Action required:** Add `learning_steps` column to `fsrs_card_states` model. This field tracks which step the card is on during Learning/Relearning phases. Without it, ts-fsrs cannot properly schedule short-interval reviews.

## ts-fsrs ReviewLog type (what we store for audit/replay)

```typescript
type ReviewLog = {
  rating: Rating;           // 1-4 (Again/Hard/Good/Easy)
  state: State;             // State BEFORE the review (0/1/2/3)
  due: Date;                // When the card was due (before this review)
  stability: number;        // Stability before review
  difficulty: number;       // Difficulty before review
  elapsed_days: number;     // Days since previous review
  last_elapsed_days: number;// Days between the two reviews before this one
  scheduled_days: number;   // Days that were scheduled between last review and this due date
  learning_steps: number;   // Step count before review
  review: Date;             // When this review happened
};
```

### Mapping to our `fsrs_review_logs` table

Our review log uses `state_before` and `state_after` JSONB columns to capture the full card state at each point. This is **more flexible** than the flat ts-fsrs ReviewLog -- the JSONB blobs contain all fields including `learning_steps` and `last_elapsed_days`.

| ts-fsrs ReviewLog field | Where we store it | Notes |
|------------------------|-------------------|-------|
| `rating` | `rating` column (INTEGER) | 1/2/3/4 |
| `state` (before) | `state_before` JSONB | Full snapshot |
| `due`, `stability`, `difficulty`, etc. | `state_before` JSONB | All pre-review state |
| `review` | `reviewed_at` column (DATE) | When review happened |
| Post-review card state | `state_after` JSONB | Full snapshot of new state |
| -- | `response_ms` | Our addition: how long user took to respond |
| -- | `effective_params_snapshot` | Our addition: FSRS params used for this review |
| -- | `effective_policy_scope` | Our addition: which policy level was applied |

The JSONB approach means we never lose data even if ts-fsrs adds new fields in future versions.

## FSRS parameters (what scheduler policies control)

```typescript
type FSRSParameters = {
  request_retention: number;  // Target retention rate (default 0.9 = 90%)
  maximum_interval: number;   // Max days between reviews (default 36500 = 100 years)
  w: number[];               // 19 weight values that control the algorithm's behavior
  enable_fuzz: boolean;      // Add randomness to intervals to prevent clustering
  enable_short_term: boolean; // Enable short-term learning steps
};
```

### How we use parameters

- Stored in `scheduler_policies.params_json` as JSONB.
- System default is in `algorithms.default_params`.
- Policy resolution: InfoBit override > Category override > User default > System default.
- Full replacement at each level (no partial merging).
- The resolved params are stamped into each review log (`effective_params_snapshot`) so reviews are replayable with exact params.

### Default weights (seeded in our algorithms table)

```javascript
[0.4, 0.6, 2.4, 5.8, 4.9, 0.9, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.57, 0.25]
```

These can be optimized per-user using the `@open-spaced-repetition/binding` optimizer package by analyzing their review history. This is a V1.1+ feature.

## How to use ts-fsrs in our codebase

### Creating initial state for a new InfoBit

```javascript
const { createEmptyCard } = require('ts-fsrs');

// When createInfoBit runs, also create FSRS state:
const initialCard = createEmptyCard(new Date());
// Save to fsrs_card_states: {
//   info_bit_id: infoBitId,
//   due: initialCard.due,
//   stability: initialCard.stability,
//   difficulty: initialCard.difficulty,
//   elapsed_days: initialCard.elapsed_days,
//   scheduled_days: initialCard.scheduled_days,
//   learning_steps: initialCard.learning_steps,
//   reps: initialCard.reps,
//   lapses: initialCard.lapses,
//   state: initialCard.state,
//   last_review: initialCard.last_review || null
// }
```

### Processing a review

```javascript
const { fsrs, generatorParameters, Rating } = require('ts-fsrs');

// 1. Load effective params for this InfoBit
const params = generatorParameters(resolvedPolicyParams);
const f = fsrs(params);

// 2. Reconstruct card object from DB
const currentCard = {
  due: dbState.due,
  stability: dbState.stability,
  difficulty: dbState.difficulty,
  elapsed_days: dbState.elapsed_days,
  scheduled_days: dbState.scheduled_days,
  learning_steps: dbState.learning_steps,
  reps: dbState.reps,
  lapses: dbState.lapses,
  state: dbState.state,
  last_review: dbState.last_review
};

// 3. Compute new state for the user's chosen rating
const ratingMap = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };
const rating = ratingMap[userRating];
const result = f.next(currentCard, new Date(), rating);

// 4. Save result.card back to fsrs_card_states
// 5. Save state_before (currentCard) and state_after (result.card) to fsrs_review_logs
// 6. Update info_bits.due_at = result.card.due
```

### State integers reference

```javascript
// State enum values (ts-fsrs uses integers)
const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3
};

// Rating enum values
const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4
};
```

## Key behaviors to understand

1. **New cards are immediately due.** `createEmptyCard()` sets `due` to the current time, so a newly created InfoBit appears in the due queue right away.

2. **Learning steps are fast.** A new card goes through Learning with short intervals (1min, 10min by default) before graduating to Review with day-level intervals.

3. **"Again" causes a lapse.** If a card in Review state gets rated Again, `lapses` increments and it enters Relearning (short intervals again).

4. **Stability only increases during Review state.** In Learning/Relearning, stability and difficulty don't change meaningfully -- the card is just progressing through steps.

5. **Fuzz adds randomness.** With `enable_fuzz: true`, intervals get slight random variation to prevent review clustering (many cards due at the same time).

6. **Maximum interval caps long-term scheduling.** Even with high stability, reviews won't be scheduled further than `maximum_interval` days out.

## File locations in our codebase

| File | Purpose |
|------|---------|
| `src/infrastructure/fsrs/engine.js` | FSRS wrapper functions (buildInitialFsrsState, serializeScheduleState) |
| `src/infrastructure/postgres/models/fsrsCardState.model.js` | Current FSRS state per InfoBit |
| `src/infrastructure/postgres/models/fsrsReviewLog.model.js` | Immutable review history |
| `src/infrastructure/postgres/models/algorithm.model.js` | Algorithm registry (seeded with `fsrs`) |
| `src/infrastructure/postgres/models/schedulerPolicy.model.js` | Policy overrides at user/category/InfoBit level |
