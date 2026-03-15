import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  Grades,
  type Card,
  type Grade,
  type FSRSParameters,
  type RecordLogItem,
} from "ts-fsrs";

export type { Card, FSRSParameters, Grade };
export { Rating, Grades };

const STATE_LABELS: Record<number, string> = {
  0: "New",
  1: "Learning",
  2: "Review",
  3: "Relearning",
};

export function stateLabel(state: number): string {
  return STATE_LABELS[state] ?? `Unknown(${state})`;
}

export interface ReviewSnapshot {
  rating: string;
  ratingValue: number;
  cardAfter: Card;
  stateLabel: string;
  dueDate: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
}

export function createLocalFsrs(overrides?: Partial<FSRSParameters>) {
  const params = generatorParameters({
    enable_fuzz: false,
    enable_short_term: true,
    ...overrides,
  });
  return fsrs(params);
}

export function simulateNewCard(startDate: Date): Card {
  return createEmptyCard(startDate);
}

function snapshotFromItem(item: RecordLogItem): ReviewSnapshot {
  const grade = item.log.rating;
  const c = item.card;
  return {
    rating: Rating[grade] ?? `Rating(${grade})`,
    ratingValue: grade,
    cardAfter: c,
    stateLabel: stateLabel(c.state),
    dueDate: c.due instanceof Date ? c.due.toISOString() : String(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    learning_steps: c.learning_steps,
  };
}

export function getOutcomesForAllRatings(
  card: Card,
  reviewDate: Date,
  paramOverrides?: Partial<FSRSParameters>
): ReviewSnapshot[] {
  const f = createLocalFsrs(paramOverrides);
  const results = f.repeat(card, reviewDate);

  // repeat returns { [Rating.Again]: ..., [Rating.Hard]: ..., ... }
  return Grades.map((grade) => {
    const item: RecordLogItem = results[grade];
    return snapshotFromItem(item);
  });
}

export function applyRating(
  card: Card,
  reviewDate: Date,
  rating: Grade,
  paramOverrides?: Partial<FSRSParameters>
): { card: Card; snapshot: ReviewSnapshot } {
  const f = createLocalFsrs(paramOverrides);
  const result = f.next(card, reviewDate, rating);
  const c = result.card;
  return {
    card: c,
    snapshot: {
      rating: Rating[rating] ?? `Rating(${rating})`,
      ratingValue: rating,
      cardAfter: c,
      stateLabel: stateLabel(c.state),
      dueDate: c.due instanceof Date ? c.due.toISOString() : String(c.due),
      stability: c.stability,
      difficulty: c.difficulty,
      elapsed_days: c.elapsed_days,
      scheduled_days: c.scheduled_days,
      reps: c.reps,
      lapses: c.lapses,
      learning_steps: c.learning_steps,
    },
  };
}
