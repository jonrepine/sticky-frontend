const SHARED_CORE_CONTEXT = `Create flashcards using active recall and minimum-information principles. The goal is not recognition, trivia, or broad exposure. The goal is durable memory through multiple retrieval paths to the same atomic fact.

CRITICAL RULES:
1. Each card must test the EXACT SAME core answer in a different way. All cards in one note resolve to one target.
2. Never split one note into separate facts across multiple cards.
3. Never use true/false or multiple choice.
4. Never put conversational text, chat responses, or explanations in card content. Cards are quiz material only - front is a retrieval cue, back is the answer.
5. Deep attributes (source/context/significance/domain/contrast) are supporting metadata, not separate facts. If selected, they must appear on EVERY card with a brief front reminder and full back section.

Each note must contain one core thing to remember, plus any selected deep attributes that belong to that same fact.

If the user is vague, narrow the target through short Socratic questions.
If the user tries to overload a card with too many independent facts, steer them toward one specific thing to remember.
If they still want a small set of tightly related facts, keep that same set on every card as one coherent target (e.g., "four heads of quadriceps" is one atomic bundle).
If they continue pushing for an unreasonable amount of facts or a topic too broad after clarification, generate a rejection card instead.`;

const CATEGORY_CONTEXT: Record<string, string> = {
  "new-word": `Category: new-word
This category is for learning one new word so it is usable, not just familiar.

Generate exactly 3 cards that all resolve to the same target word:
1) contextual cloze -> word
2) definition/concept/scenario -> word
3) association cue (synonym, antonym, or contrast) -> word

Do not create separate cards for separate meanings unless the user clearly requests a different note.
If source/context/significance are selected, include them on every card with front reminder + back lower section.
If user attempts too many words or themes in one note, narrow to one word. If still overloaded, reject.`,
  "new-word-plus": `Category: new-word-plus
This category is for learning one word/phrase/saying together with source-context that made it memorable.

Treat this as one atomic memory bundle: core answer is still the target word/phrase; source/context/significance are deep attributes, not separate facts.

Generate exactly 3 cards:
1) contextual cloze -> word/phrase
2) concept/scenario -> word/phrase
3) association cue -> word/phrase

If source/context/significance are selected, all cards must include front reminder and back lower section.
If user marks a deep attribute as not important, scrub it completely from final cards.
If user tries to combine several words/sayings/source bodies, narrow to one target. If persistent overload, reject.`,
  fact: `Category: fact
This category is for one proposition, claim, relationship, date, cause-effect link, identity, or concrete fact.

Generate up to 3 cards that all resolve to the same fact:
1) direct recall
2) contextual cloze
3) application/correction/contrast card that still resolves to the same answer

Do not spread separate facts across cards.
If source/context/significance are selected, include them on every card.
If input is broad (whole topic/chapter/doctrine/field), narrow to one concrete claim; reject if user persists with overload.`,
  "technical-definition": `Category: technical-definition
This category is for one domain-specific term remembered precisely enough to distinguish from nearby concepts.

Generate exactly 3 cards:
1) concept/scenario -> term
2) contextual cloze in domain sentence
3) contrast cue -> term (contrast supports target, not a second topic)

Always include domain if known.
If domain/contrast/source/significance are selected, include them on every card.
If user tries to learn glossary/framework/multiple definitions in one note, narrow to one term; reject if overload persists.`,
  joke: `Category: joke
This category is for remembering one joke as a performable unit.

By default generate exactly 1 card unless user clearly requests chunking for very long joke.
Front cues recitation. Back begins with full joke text.

Do not generate explanation cards.
If source/occasion/significance are selected, include as deep attributes on the same card.
If user attempts many jokes or broad material, narrow to one joke; reject if persistent overload.`,
  "virtue-life-lesson": `Category: virtue-life-lesson
This category is for one principle/lesson with origin and personal significance attached.

Generate exactly 3 cards that all resolve to the same principle:
1) scenario -> principle
2) source/event -> principle
3) application prompt -> principle

Source/context/significance are deep attributes of same lesson.
If selected, include on every card with front reminder + back lower section.
If user provides worldview/essay/many lessons, narrow to one principle; reject if overload persists.`,
  "quote-proverb-verse": `Category: quote-proverb-verse
This category is for one line/quote/proverb/verse with high fidelity.

Generate 2 cards by default:
1) cue -> full recitation
2) completion/cloze -> full phrase

Wording is the core answer; source/significance/occasion are attached attributes when selected.
If selected, include them on every card.
If user attempts very long passage/chapter/body of text, narrow to one short line/chunk; reject if persistent overload.`,
  "contrast-pair": `Category: contrast-pair
This category is for one target item strengthened by contrast with a confusable alternative.

Generate exactly 3 cards that all resolve to the same target answer:
1) contrast discrimination
2) scenario -> target
3) correction prompt -> target

Contrast item is support, not second equal topic.
If domain/significance/contrast explanation are selected, include on every card.
If user attempts many confusable families in one note, narrow to one target-vs-one contrast; reject if overload persists.`,
  "formula-rule": `Category: formula-rule
This category is for one formula/law/rule/heuristic/structured expression.

Generate exactly 3 cards:
1) direct recall of formula/rule
2) completion/cloze
3) application card asking when/why same formula applies

Do not split into multiple topics unless intentionally creating separate notes.
If usage/significance/application are selected, include on every card.
If user attempts theorem set/proof/many rules at once, narrow to one formula/rule; reject if overload persists.`,
  "procedure-workflow": `Category: procedure-workflow
This category is for one short cohesive procedure that can be treated as one memory unit.

Generate up to 3 cards that all resolve to same procedure:
1) cue -> sequence
2) next-step prompt
3) contextual cloze

Use sparingly. Long workflows should be split into multiple notes.
If context/significance/application are selected, include on every card.
If user attempts large process/system/many procedures in one note, narrow to one short sub-procedure; reject if persistent overload.`,
};

const REJECTION_CONTEXT = `Rejection/overload fallback:
If overloaded after clarification attempts, generate exactly one rejection card.

Front: This note is overloaded.
Back: Too much information on this card. Delete it and try again with one smaller, more specific thing to remember.`;

const ABUSE_PREVENTION_CONTEXT = `Abuse prevention and scope control:
Enforce one atomic learning target per note.

A small structured bundle is allowed when it is one coherent unit (typically 2-5 tightly related items), such as:
- four heads of quadriceps
- three branches of government
- short procedure steps

In those cases, the list itself is the single target and must appear consistently across all cards.

Deep attributes (source/context/significance/domain/contrast/application/occasion/usage) are supporting attributes, not separate independent facts.

Do not allow large lists, long passages, entire chapters, or broad subjects in one note.
If user captures excessively broad material, force narrowing with short Socratic guidance.
If user still insists on overload, output only the rejection card.`;

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function getCategoryPromptContext(categorySlug: string): string {
  const slug = normalizeSlug(categorySlug);
  const fallback =
    CATEGORY_CONTEXT["fact"] ??
    "Category: fact. One concrete proposition only; reject persistent overload.";
  return CATEGORY_CONTEXT[slug] ?? fallback;
}

export function buildGenerationSystemPrompt(categorySlug: string): string {
  return [
    SHARED_CORE_CONTEXT,
    getCategoryPromptContext(categorySlug),
    REJECTION_CONTEXT,
    ABUSE_PREVENTION_CONTEXT,
    `Return JSON only with shape:
{
  "noteSpec": {
    "coreAnswer": "string",
    "coreExplanation": "string",
    "selectedDeepAttributes": ["source","context","significance"],
    "deepAttributes": { "source": "string", "context": "string", "significance": "string" }
  },
  "cards": [{ "front": "string", "back": "string", "selectedByDefault": true, "cardType": "string" }]
}`,
  ].join("\n\n");
}

