Yes. The correction is:

**Context and significance are not separate cards.**
They are **deep attributes bound to the same atomic fact**.
If the user chooses to keep them during Socratic questioning, they must appear as a lower section on **every single card** for that note, and the **front of every card** should signal that those attributes are part of the intended recall.

And yes, for **New Word**, the correct default shape is essentially:

* **Card 1:** Cloze sentence context -> **Word**
* **Card 2:** Definition / scenario -> **Word**
* **Card 3:** Synonym / antonym / contrast cue -> **Word**

The only nuance is that Card 3 should use **whichever association is cleanest**: synonym, antonym, or contrast. The goal is not “synonym at all costs,” but “strong associative path to the same word.”

---

# Spec: Category-Aware Flashcard Generation for Atomic Facts with Deep Attributes

## 1. Core doctrine

The app should generate cards using this rule:

**One note = one atomic fact with deep attributes.**
**Multiple cards = multiple retrieval paths to that same note.**

An **atomic fact** is the main thing the learner wants to be able to recall.
A **deep attribute** is contextual material that belongs to that fact and strengthens it, such as:

* source
* encounter context
* significance / why it matters
* usage context
* domain
* contrast / confusable term
* occasion
* application cue

These deep attributes are **not separate facts** and should **not become separate cards**. They are the attached memory structure around the same core answer.

So the generation model must obey this:

* Every card in a note tests the **same core answer**
* If context/significance/source are kept, they must appear on **every card**
* The front of every card should indicate which deep attributes are attached
* The back of every card should render the same deep attributes in a consistent lower section
* The card should still have **one main retrieval target**, not several independent questions

That is the right balance:

* **atomic at the center**
* **rich at the edges**
* **same note bundle on every card**
* **different prompts, same answer**

---

## 2. Universal generation contract

Use this as the global LLM instruction above all category-specific instructions.

```txt
You are generating spaced-repetition flashcards, not tutoring.

Convert the user's capture into exactly one atomic fact with optional deep attributes.

An atomic fact has:
- one core answer or recitable target
- zero or more deep attributes that belong to that same answer

Deep attributes may include:
- source
- context
- significance
- usage
- domain
- contrast
- occasion
- application

Rules:
1. Generate multiple cards only as alternate retrieval paths to the SAME atomic fact.
2. Never split the user's input into different facts across different cards.
3. If a deep attribute is selected to be remembered, it must appear on EVERY card for that note.
4. Every front must show a compact indicator of the selected deep attributes, but that indicator is not a separate graded question.
5. The first line of every back must be the exact answer only.
6. Lower lines on the back contain deep attributes in a consistent order.
7. Keep each card short, clear, and singular in its main prompt.
8. Never use true/false or multiple choice.
9. Ask only for missing information.
10. If the input contains too many independent facts, ask the user to narrow it.
11. If the user insists on overloading one card after the allowed clarification rounds, output exactly one rejection card whose back says:
   "You tried to put too much in one card. Delete this card and try again."

Return:
- normalized note spec
- candidate cards
- validator flags
```

---

## 3. The correct mental model: Atomic Facts with Deep Attributes

This is the design principle the app should follow.

### Wrong model

“Three cards means I can cover three different facts.”

### Correct model

“One fact. Three ways of forcing recall. Same answer. Same attached context.”

### Example

User wants to learn:

* Word: **ephemeral**
* Meaning: lasting a very short time
* Source: heard it in a book review
* Context: reviewer said online fame is ephemeral
* Significance: user wants to start using it naturally

That is **not** five separate facts.
That is **one lexical memory bundle** with a core answer (`ephemeral`) and deep attributes.

All generated cards must still resolve to **ephemeral**.
Source/context/significance ride underneath it on **every card**.

---

## 4. Universal card rendering contract

## Front

Each front has:

1. the main prompt
2. a compact reminder line showing selected deep attributes

Use a clear text indicator, not just icons.

Recommended format:

```txt
Also recall: source • context • why it matters
```

Only show the attributes that the user actually chose to keep.

Important:

* this reminder is **not** a second explicit question
* it is a recall cue, not a second grading target on the front
* it tells the learner: “this note includes more than the core answer”

## Back

Every back should use the same order:

```txt
Line 1: <Exact answer / target text>
Line 2: Meaning / Explanation: <short line>
Line 3: Source: <if kept>
Line 4: Context: <if kept>
Line 5: Significance: <if kept>
Line 6: Contrast / Usage / Domain / Occasion: <if relevant>
```

Rules:

* line 1 must be the answer only
* do not bury the answer below explanation
* omit empty lines
* keep lower lines short
* every selected deep attribute must appear on every back

---

## 5. Enhanced Socratic logic

The Socratic phase should be a **quick coach**, not a chat.
It should ask only what it does not know, and only what matters for that category.

## Global Socratic sequence

### Step 1: Atomicity check

Ask:

```txt
What single thing should this note help you recall later?
```

Only ask this if the input is unclear or overloaded.

### Step 2: Category-specific required fields

Ask only for missing fields required by the category.

### Step 3: Deep attribute checks

Use these two universal triggers where they make sense.

#### Anchor Check

```txt
Where did you encounter this? Should we track the source/context for better recall?
```

If yes, collect:

* source
* encounter context / how it was used

#### Value Check

```txt
Is the “why” behind this obvious, or should we add a Significance section to make it stick?
```

If yes, ask:

```txt
Briefly, what is the core significance of this to you?
```

#### Not Important filter

If the user marks something as **not important**, it is scrubbed from the note spec and from all final cards.

That means:

* no badge for it on the front
* no lower section for it on the back
* no generated prompt angle based on it

---

## 6. Recommended normalized note schema

Add a note-spec layer before card generation.

```ts
type DeepAttribute =
  | "source"
  | "context"
  | "significance"
  | "usage"
  | "domain"
  | "contrast"
  | "occasion"
  | "application";

type NoteSpec = {
  categoryId: string;
  coreAnswer: string;
  coreExplanation?: string;
  exactnessMode: "gist" | "term_exact" | "phrase_exact" | "verbatim";
  deepAttributes: Partial<Record<DeepAttribute, string>>;
  selectedDeepAttributes: DeepAttribute[];
  frontReminderText?: string;
  maxIndependentFactsPerNote: number;
};
```

The app should generate the note spec first, then render cards from that.

---

# 7. Category specs

---

## Category: `new-word`

### Purpose

Remember a word so the learner can:

* produce it
* understand it in context
* connect it to words already known

### LLM context

```txt
This is a vocabulary note.

Generate exactly 3 cards and no more.

All 3 cards must resolve to the same target word.

Use this exact structure:
1. Cloze Deletion: sentence context -> word
2. Definition / concept / scenario -> word
3. Synonym / antonym / contrast cue -> word

Do not create a plain word -> definition recognition card unless explicitly requested.
Do not introduce separate facts across cards.
If source, context, or significance are selected, they must appear on every card and be signaled on every front.
```

### Recommended config

```yaml
targetCardCount: 3
requiredCardStyles:
  - cloze_contextual
  - definition_to_word
  - association_to_word
creativityLevel: 2
deviationAllowance: 1
maxSocraticRounds: 2
includeClozeCard: true
socraticModeDefault: true
memoryArchetype: vocab_usage
exactnessMode: term_exact
deepAttributesSupported:
  - source
  - context
  - significance
  - contrast
```

### Socratic logic

Ask only what is missing:

* “What does this word mean in simple terms?”
* “Do you have a sentence where you saw it, or should I create a natural one?”
* Anchor Check if user input suggests memorable source context
* Value Check if it seems personally important

If source/context/significance are marked not important, omit them completely.

### Example note

* Word: `ephemeral`
* Meaning: lasting for a very short time

### Example cards

#### Card 1

**Front**

```txt
The beauty of a sunset is {{c1::_____}}, fading into darkness after just a few minutes.
```

**Back**

```txt
ephemeral
Meaning: lasting for a very short time
Usage: often used for beauty, fame, moods, and brief experiences
```

#### Card 2

**Front**

```txt
What adjective describes something fleeting and short-lived?
```

**Back**

```txt
ephemeral
Meaning: lasting for a very short time
Usage: often used for beauty, fame, moods, and brief experiences
```

#### Card 3

**Front**

```txt
What more advanced word means “fleeting” or the opposite of enduring?
```

**Back**

```txt
ephemeral
Meaning: lasting for a very short time
Usage: often used for beauty, fame, moods, and brief experiences
```

---

## Category: `new-word-plus`

### Purpose

Remember the word **and** the source/context/significance that made it memorable.

This is still one lexical memory bundle, not multiple facts.

### Critical rule

If the user chooses to keep source/context/significance during Socratic questioning, then:

* every front must indicate those attached attributes
* every back must render them
* every card still resolves to the same word

### LLM context

```txt
This is a source-anchored vocabulary note.

Generate exactly 3 cards and no more.

Use the same 3-card structure as new-word:
1. Cloze Deletion: sentence context -> word
2. Definition / concept / scenario -> word
3. Synonym / antonym / contrast cue -> word

The source, encounter context, and significance are deep attributes of the same word.
They are not separate cards.
If selected by the user, they must appear on EVERY card.

Each front must include a reminder line such as:
"Also recall: source • context • why it matters"

Each back must include:
- target word
- meaning
- source
- context
- significance

Do not turn any deep attribute into a second main question.
```

### Recommended config

```yaml
targetCardCount: 3
requiredCardStyles:
  - cloze_contextual
  - definition_to_word
  - association_to_word
creativityLevel: 2
deviationAllowance: 1
maxSocraticRounds: 2
includeClozeCard: true
socraticModeDefault: true
memoryArchetype: source_anchored_vocab
exactnessMode: term_exact
deepAttributesSupported:
  - source
  - context
  - significance
deepAttributesDefaultPrompting:
  source: true
  context: true
  significance: true
```

### Socratic logic

Ask only what is missing:

* “What does the word mean in simple terms?”
* “Do you have the original sentence, or should I create one?”
* **Anchor Check:** “Where did you encounter this? Should we track the source/context for better recall?”
* If yes: “Briefly, where was it and how was it used?”
* **Value Check:** “Is the ‘why’ behind this obvious, or should we add a Significance section to make it stick?”
* If yes: “Briefly, what is the core significance of this to you?”

If the user declines source/context/significance, scrub them completely and effectively treat the note like `new-word`.

### Example note

* Word: `ephemeral`
* Meaning: lasting for a very short time
* Source: heard in a book review on YouTube
* Context: reviewer said online fame is ephemeral
* Significance: I keep seeing this word and want to use it naturally

### Example cards

#### Card 1

**Front**

```txt
Also recall: source • context • why it matters

The reviewer said online fame is {{c1::_____}}.
```

**Back**

```txt
ephemeral
Meaning: lasting for a very short time
Source: book review on YouTube
Context: used to describe how quickly online fame disappears
Significance: I keep seeing this word and want to use it naturally
```

#### Card 2

**Front**

```txt
Also recall: source • context • why it matters

What adjective means fleeting, temporary, or short-lived?
```

**Back**

```txt
ephemeral
Meaning: lasting for a very short time
Source: book review on YouTube
Context: used to describe how quickly online fame disappears
Significance: I keep seeing this word and want to use it naturally
```

#### Card 3

**Front**

```txt
Also recall: source • context • why it matters

What stronger word means “temporary” or the opposite of enduring?
```

**Back**

```txt
ephemeral
Meaning: lasting for a very short time
Source: book review on YouTube
Context: used to describe how quickly online fame disappears
Significance: I keep seeing this word and want to use it naturally
```

---

## Category: `fact`

### Purpose

Remember one proposition, relation, date, cause, identity, or claim.

### LLM context

```txt
This is a proposition note.

First normalize the input into one concrete fact sentence.

Then generate up to 3 cards:
1. direct recall
2. cloze context
3. application or correction prompt

All cards must test the same proposition.
Do not split the topic into multiple facts.
If source, context, or significance are selected, they must appear on every card and be signaled on every front.
```

### Recommended config

```yaml
targetCardCount: 3
requiredCardStyles:
  - direct_qa
  - cloze_contextual
  - correction_or_application
creativityLevel: 1
deviationAllowance: 1
maxSocraticRounds: 2
includeClozeCard: true
socraticModeDefault: true
memoryArchetype: proposition
exactnessMode: gist
deepAttributesSupported:
  - source
  - context
  - significance
```

### Socratic logic

Ask only what is missing:

* “What single fact do you want this note to capture?”
* “Is this mainly a date, name, cause/effect, place, or relationship?”
* Anchor Check if source matters
* Value Check if significance matters

### Example note

* Core fact: `The capital of Australia is Canberra`
* Significance: I always mix this up with Sydney

### Example cards

#### Card 1

**Front**

```txt
Also recall: why it matters

What is the capital of Australia?
```

**Back**

```txt
Canberra
Meaning / Explanation: the capital city of Australia
Significance: I tend to confuse it with Sydney
```

#### Card 2

**Front**

```txt
Also recall: why it matters

Unlike Sydney or Melbourne, the capital city of Australia is {{c1::_____}}.
```

**Back**

```txt
Canberra
Meaning / Explanation: the capital city of Australia
Significance: I tend to confuse it with Sydney
```

#### Card 3

**Front**

```txt
Also recall: why it matters

If someone says Sydney is Australia’s capital, which city corrects that claim?
```

**Back**

```txt
Canberra
Meaning / Explanation: the capital city of Australia
Significance: I tend to confuse it with Sydney
```

---

## Category: `technical-definition`

### Purpose

Remember a term, its exact meaning in a domain, and how it differs from confusable neighbors.

### LLM context

```txt
This is a domain-specific definition note.

Generate exactly 3 cards:
1. concept / scenario -> term
2. cloze in a domain sentence
3. contrast cue -> term

All cards must resolve to the same technical term.
The contrast card must clarify the main term, not become a second full topic.
Always label the domain if known.
If source, context, or significance are selected, they must appear on every card.
```

### Recommended config

```yaml
targetCardCount: 3
requiredCardStyles:
  - concept_to_term
  - cloze_contextual
  - contrast_to_term
creativityLevel: 1
deviationAllowance: 1
maxSocraticRounds: 2
includeClozeCard: true
socraticModeDefault: true
memoryArchetype: technical_definition
exactnessMode: term_exact
deepAttributesSupported:
  - domain
  - contrast
  - source
  - significance
```

### Socratic logic

Ask only what is missing:

* “What field is this from?”
* “What is the simplest correct definition?”
* “What term do you confuse it with most?”
* Value Check only if useful

### Example note

* Term: `idempotent`
* Domain: HTTP / APIs
* Meaning: can be repeated without causing additional effect beyond the first successful application
* Contrast: deterministic
* Significance: important for API interview prep

### Example cards

#### Card 1

**Front**

```txt
[HTTP / APIs]
Also recall: contrast • why it matters

What term describes an operation that can be repeated without creating additional effect after the first successful application?
```

**Back**

```txt
idempotent
Meaning / Explanation: repeatable without additional effect beyond the first successful application
Significance: important for API interview prep
Contrast: deterministic is about same output for same input; idempotent is about repeated application
```

#### Card 2

**Front**

```txt
[HTTP / APIs]
Also recall: contrast • why it matters

GET requests are intended to be {{c1::_____}} because repeating them should not create extra state changes.
```

**Back**

```txt
idempotent
Meaning / Explanation: repeatable without additional effect beyond the first successful application
Significance: important for API interview prep
Contrast: deterministic is about same output for same input; idempotent is about repeated application
```

#### Card 3

**Front**

```txt
[HTTP / APIs]
Also recall: contrast • why it matters

What term focuses on “safe repeated application,” not merely “same output for the same input”?
```

**Back**

```txt
idempotent
Meaning / Explanation: repeatable without additional effect beyond the first successful application
Significance: important for API interview prep
Contrast: deterministic is about same output for same input; idempotent is about repeated application
```

---

## Category: `joke`

### Purpose

Remember a joke as a performable unit.

This category should be simple and strict.

### LLM context

```txt
This is an exact-recitation note.

By default generate exactly 1 card.

Front:
"Can you recite the joke about <short cue>?"

Back:
- exact joke text on line 1
- optional source / occasion / significance below if selected

Do not paraphrase unless the user explicitly requests gist mode.
Do not generate explanation cards.
If source, occasion, or significance are selected, they must appear on the card.
```

### Recommended config

```yaml
targetCardCount: 1
requiredCardStyles:
  - exact_recitation
creativityLevel: 1
deviationAllowance: 1
maxSocraticRounds: 1
includeClozeCard: false
socraticModeDefault: false
memoryArchetype: exact_recitation
exactnessMode: verbatim
deepAttributesSupported:
  - source
  - occasion
  - significance
```

### Socratic logic

Ask only what is missing:

* “What short cue should trigger the joke?”
* “Do you want the exact wording, or just the structure?”
* Anchor Check only if source/occasion matters
* Value Check only if user wants it

### Example note

* Cue: pirate with the steering wheel in his pants
* Joke text: `A pirate walks into a bar with a steering wheel in his pants. The bartender says, “Hey, you’ve got a steering wheel in your pants.” The pirate says, “Arrr, and it’s driving me nuts.”`

### Example card

#### Card 1

**Front**

```txt
Can you recite the joke about the pirate with the steering wheel in his pants?
```

**Back**

```txt
A pirate walks into a bar with a steering wheel in his pants. The bartender says, “Hey, you’ve got a steering wheel in your pants.” The pirate says, “Arrr, and it’s driving me nuts.”
```

If source/occasion/significance were saved, they would be shown below that exact text.

---

## Category: `virtue-life-lesson`

### Purpose

Remember a principle, where it came from, and why it matters.

This is a strong category and worth adding.

### LLM context

```txt
This is a principle note with optional deep attributes.

Generate exactly 3 cards:
1. scenario -> principle
2. source/event -> principle
3. application prompt -> principle

All cards must resolve to the same lesson.
Source and significance are deep attributes of the same lesson.
If selected, they must appear on every card and be signaled on every front.
```

### Recommended config

```yaml
targetCardCount: 3
requiredCardStyles:
  - scenario_to_principle
  - source_to_principle
  - application_to_principle
creativityLevel: 2
deviationAllowance: 1
maxSocraticRounds: 2
includeClozeCard: false
socraticModeDefault: true
memoryArchetype: principle_with_source
exactnessMode: gist
deepAttributesSupported:
  - source
  - context
  - significance
  - application
```

### Socratic logic

Ask only what is missing:

* “What is the lesson in one sentence?”
* “Where did you learn it?”
* “Should we keep why it matters as part of the memory?”
* If yes: “Briefly, why is this important to you?”

### Example note

* Lesson: `Do the hard thing first`
* Source: advice from my coach
* Context: after I kept procrastinating on the hardest task
* Significance: it reduces dread and improves momentum

### Example cards

#### Card 1

**Front**

```txt
Also recall: source • context • why it matters

What principle helps when you keep procrastinating on the hardest task?
```

**Back**

```txt
Do the hard thing first
Meaning / Explanation: start with the hardest important task before easier ones
Source: advice from my coach
Context: after repeated procrastination on difficult work
Significance: it reduces dread and improves momentum
```

#### Card 2

**Front**

```txt
Also recall: source • context • why it matters

What lesson did your coach emphasize after you kept avoiding the hardest task?
```

**Back**

```txt
Do the hard thing first
Meaning / Explanation: start with the hardest important task before easier ones
Source: advice from my coach
Context: after repeated procrastination on difficult work
Significance: it reduces dread and improves momentum
```

#### Card 3

**Front**

```txt
Also recall: source • context • why it matters

When you want less dread and more momentum, what principle should you apply first thing?
```

**Back**

```txt
Do the hard thing first
Meaning / Explanation: start with the hardest important task before easier ones
Source: advice from my coach
Context: after repeated procrastination on difficult work
Significance: it reduces dread and improves momentum
```

---

# 8. Additional categories worth adding

These are strong, common memory types.

---

## Category: `quote-proverb-verse`

### Purpose

Remember wording with high fidelity.

### LLM context

```txt
This is a phrase-exact or verbatim recitation note.

Generate 2 cards:
1. cue -> full recitation
2. partial completion / cloze -> full phrase

All cards must resolve to the same quoted text.
If source or significance are selected, they must appear on every card.
```

### Recommended config

```yaml
targetCardCount: 2
requiredCardStyles:
  - cue_to_recitation
  - phrase_completion
creativityLevel: 1
deviationAllowance: 1
maxSocraticRounds: 1
includeClozeCard: true
socraticModeDefault: false
memoryArchetype: exact_recitation
exactnessMode: phrase_exact
deepAttributesSupported:
  - source
  - significance
  - occasion
```

### Example note

* Quote: `This too shall pass.`
* Source: proverb
* Significance: helps when stressed

### Example cards

#### Card 1

**Front**

```txt
Also recall: source • why it matters

Can you recite the proverb that reminds you not to over-identify with a difficult moment?
```

**Back**

```txt
This too shall pass.
Source: proverb
Significance: helps me during stress spikes
```

#### Card 2

**Front**

```txt
Also recall: source • why it matters

Complete the phrase: “This too shall _____.”
```

**Back**

```txt
This too shall pass.
Source: proverb
Significance: helps me during stress spikes
```

---

## Category: `contrast-pair`

### Purpose

Remember one of two commonly confused ideas by forcing contrast.

### LLM context

```txt
This is a confusion-reduction note.

Generate 3 cards that all resolve to the same target item, using the contrast item only as support.
Do not make the second item an equal second topic.
```

### Recommended config

```yaml
targetCardCount: 3
requiredCardStyles:
  - contrast_discrimination
  - scenario_to_target
  - correction_prompt
creativityLevel: 1
deviationAllowance: 1
maxSocraticRounds: 2
includeClozeCard: false
socraticModeDefault: true
memoryArchetype: contrast_pair
exactnessMode: term_exact
deepAttributesSupported:
  - contrast
  - significance
  - domain
```

### Example note

* Target: `effect`
* Contrast: `affect`
* Meaning: noun meaning result
* Significance: I confuse them in writing

### Example cards

#### Card 1

**Front**

```txt
Also recall: contrast • why it matters

Which word means “result”: affect or effect?
```

**Back**

```txt
effect
Meaning / Explanation: result or consequence
Significance: I confuse it in writing
Contrast: affect is usually a verb meaning to influence
```

#### Card 2

**Front**

```txt
Also recall: contrast • why it matters

In the sentence “The medicine had an immediate _____,” which word belongs here?
```

**Back**

```txt
effect
Meaning / Explanation: result or consequence
Significance: I confuse it in writing
Contrast: affect is usually a verb meaning to influence
```

#### Card 3

**Front**

```txt
Also recall: contrast • why it matters

If you mean “the result,” which word should you choose?
```

**Back**

```txt
effect
Meaning / Explanation: result or consequence
Significance: I confuse it in writing
Contrast: affect is usually a verb meaning to influence
```

---

## Category: `formula-rule`

### Purpose

Remember a formula or rule and when it applies.

### LLM context

```txt
This is a formula/rule note.

Generate 3 cards:
1. direct recall of formula/rule
2. completion/cloze
3. when-to-use application prompt

All cards must resolve to the same formula or rule.
If significance or usage context are selected, they must appear on every card.
```

### Recommended config

```yaml
targetCardCount: 3
requiredCardStyles:
  - direct_formula
  - formula_completion
  - application_prompt
creativityLevel: 1
deviationAllowance: 1
maxSocraticRounds: 2
includeClozeCard: true
socraticModeDefault: true
memoryArchetype: formula_rule
exactnessMode: term_exact
deepAttributesSupported:
  - context
  - significance
  - application
```

### Example note

* Formula: `Area of a circle = πr²`
* Significance: basic geometry review

### Example cards

#### Card 1

**Front**

```txt
Also recall: why it matters

What is the formula for the area of a circle?
```

**Back**

```txt
A = πr²
Meaning / Explanation: gives the area from the radius
Significance: basic geometry review
```

#### Card 2

**Front**

```txt
Also recall: why it matters

Complete the formula: A = π_____²
```

**Back**

```txt
A = πr²
Meaning / Explanation: gives the area from the radius
Significance: basic geometry review
```

#### Card 3

**Front**

```txt
Also recall: why it matters

If you know a circle’s radius and need its area, what formula should you use?
```

**Back**

```txt
A = πr²
Meaning / Explanation: gives the area from the radius
Significance: basic geometry review
```

---

## Category: `procedure-workflow`

### Purpose

Remember a short ordered sequence.

Use this sparingly. It is one of the few cases where a note may intentionally contain a small structured bundle.

### LLM context

```txt
This is a short procedure note.

Only allow it if the sequence is short and cohesive.
Generate cards that test the same procedure from different angles:
1. cue -> full sequence
2. next-step prompt
3. cloze in procedure context

If the sequence is too long, ask to split it.
```

### Recommended config

```yaml
targetCardCount: 3
requiredCardStyles:
  - cue_to_sequence
  - next_step
  - procedure_cloze
creativityLevel: 1
deviationAllowance: 1
maxSocraticRounds: 2
includeClozeCard: true
socraticModeDefault: true
memoryArchetype: procedure_sequence
exactnessMode: gist
deepAttributesSupported:
  - context
  - significance
  - application
```

### Example note

* Procedure: `For pour-over coffee: bloom first, then slow spiral pour, then finish at target weight`
* Significance: improves consistency

### Example cards

#### Card 1

**Front**

```txt
Also recall: why it matters

What is your 3-step pour-over sequence?
```

**Back**

```txt
Bloom first, then slow spiral pour, then finish at target weight
Meaning / Explanation: simple repeatable sequence for consistent extraction
Significance: improves brew consistency
```

#### Card 2

**Front**

```txt
Also recall: why it matters

After the bloom phase in your pour-over routine, what comes next?
```

**Back**

```txt
Bloom first, then slow spiral pour, then finish at target weight
Meaning / Explanation: simple repeatable sequence for consistent extraction
Significance: improves brew consistency
```

#### Card 3

**Front**

```txt
Also recall: why it matters

In your pour-over routine: bloom first, then {{c1::_____}}, then finish at target weight.
```

**Back**

```txt
Bloom first, then slow spiral pour, then finish at target weight
Meaning / Explanation: simple repeatable sequence for consistent extraction
Significance: improves brew consistency
```

---

# 9. Guardrails

These should be hard rules.

## No true/false

Do not support true/false as a generated style. It encourages recognition and guessing instead of recall.

## No multiple choice by default

Same reason.

## One independent fact per note by default

Except for:

* short exact recitations
* short contrast pairs
* short formulas
* short procedures

Even there, keep it tight.

## Overload handling

If user enters something huge like:

* “the entire Bible”
* “everything about calculus”
* “all networking”
* “all of this lecture”

then:

1. ask for narrowing
2. ask again if still overloaded
3. if user insists, return the rejection card:

```txt
Front:
This note was overloaded.

Back:
You tried to put too much in one card. Delete this card and try again.
```

## Not Important means remove completely

If user marks:

* source not important
* significance not important
* context not important

then that field is erased from:

* note spec
* front reminder
* back section
* candidate prompt design

## Front reminder is mandatory when deep attributes are saved

If a note has saved deep attributes, every front must say so.

Use:

```txt
Also recall: source • context • why it matters
```

or a compact equivalent.

## Back bundle is mandatory

If a deep attribute is selected, it must appear on every back for that note.

---

# 10. Validation rules

Before cards are shown to the user, validate them.

A card set fails if:

* card 1, 2, and 3 do not resolve to the same core answer
* a selected deep attribute is missing from any card
* the front asks two unrelated main questions
* the back does not begin with the answer
* the card introduced a new fact not in the note spec
* the note exceeds the category’s allowed number of independent facts
* forbidden styles were used

Recommended validator checks:

```ts
sameCoreAnswerAcrossVariants: boolean
selectedDeepAttributesPresentOnEveryCard: boolean
frontReminderMatchesSelectedAttributes: boolean
backStartsWithCoreAnswer: boolean
noUnboundNewFactsIntroduced: boolean
cardMainPromptIsSingular: boolean
categoryStyleRulesSatisfied: boolean
```

---

# 11. Recommended category policy map

This is the cleaner category doctrine.

```yaml
new-word:
  cards: 3
  pattern:
    - cloze_contextual
    - definition_to_word
    - association_to_word
  deepAttributes:
    optional: [source, context, significance, contrast]

new-word-plus:
  cards: 3
  pattern:
    - cloze_contextual
    - definition_to_word
    - association_to_word
  deepAttributes:
    optional_but_strongly_prompted: [source, context, significance]

fact:
  cards: 3
  pattern:
    - direct_qa
    - cloze_contextual
    - correction_or_application
  deepAttributes:
    optional: [source, context, significance]

technical-definition:
  cards: 3
  pattern:
    - concept_to_term
    - cloze_contextual
    - contrast_to_term
  deepAttributes:
    optional: [domain, contrast, source, significance]

joke:
  cards: 1
  pattern:
    - exact_recitation
  deepAttributes:
    optional: [source, occasion, significance]

virtue-life-lesson:
  cards: 3
  pattern:
    - scenario_to_principle
    - source_to_principle
    - application_to_principle
  deepAttributes:
    optional_but_strongly_prompted: [source, context, significance]

quote-proverb-verse:
  cards: 2
  pattern:
    - cue_to_recitation
    - phrase_completion
  deepAttributes:
    optional: [source, significance, occasion]

contrast-pair:
  cards: 3
  pattern:
    - contrast_discrimination
    - scenario_to_target
    - correction_prompt
  deepAttributes:
    optional: [contrast, domain, significance]

formula-rule:
  cards: 3
  pattern:
    - direct_formula
    - formula_completion
    - application_prompt
  deepAttributes:
    optional: [context, significance, application]

procedure-workflow:
  cards: 3
  pattern:
    - cue_to_sequence
    - next_step
    - procedure_cloze
  deepAttributes:
    optional: [context, significance, application]
```

---

# 12. Final implementation note

The biggest architectural change is this:

Do **not** prompt the LLM as if the category is just a label.
Prompt it as if the category defines:

* what the atomic fact is
* which deep attributes are allowed
* which deep attributes should be asked for
* how many cards are appropriate
* what those card patterns must be
* when to reject overload
* how to render front reminders and back bundles

That is what makes the category system actually meaningful.

And the most important correction from your feedback is now explicit:

**Context and significance are not optional sidecards.**
They are **deep attributes of the same atomic fact**, and when selected, they belong on **every card**.

If you want, the next step is for me to turn this into a literal **TypeScript config object + prompt templates + validator pseudocode** that matches your current app settings model.
