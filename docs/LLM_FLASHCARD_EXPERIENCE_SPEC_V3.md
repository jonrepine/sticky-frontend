# LLM Flashcard Experience Spec V3

Last updated: 2026-03-08  
Status: Implemented in frontend proxy/UI for generation behavior; backend policy APIs are spec-only.

---

## 1) Goals

- Improve flashcard quality for factual learning with the minimum-information principle.
- Keep each generated set anchored to one core fact/concept, while varying retrieval angle.
- Always include a contextual fill-in-the-blank card when feasible.
- Support optional second Socratic round only when needed and rarely used.
- Add category-aware generation behavior for `New Word+`.

---

## 2) Evidence-Based Authoring Principles

Prompt and post-processing rules should align to:

- One core fact per set (atomic retrieval target).
- Active recall over recognition cues.
- Context-rich cloze prompts for usage memory.
- Low redundancy between cards in the same set.
- "With discretion" controls to allow fewer cards for narrow/simple input.

Primary references:

- SuperMemo minimum-information rules: https://www.super-memory.com/articles/20rules.htm
- Anki authoring guidance for concise prompts: https://docs.ankiweb.net/editing.html?highlight=cloze+deletion
- Retrieval + spacing evidence review: https://www.nature.com/articles/s44159-022-00089-1

---

## 3) Generation Contract (Frontend Local LLM Proxy)

Proxy endpoints:

- `POST /api/llm/socratic-questions`
- `POST /api/llm/generate-cards`

### 3.1 Socratic request payload

```json
{
  "inputText": "string",
  "categoryName": "string",
  "categorySlug": "string",
  "tags": ["string"],
  "qaContext": [],
  "round": 1,
  "maxRounds": 2
}
```

### 3.2 Socratic response payload

```json
{
  "round": 1,
  "needsFollowUp": false,
  "reason": "string",
  "questions": [
    { "id": "q1", "text": "string", "options": ["string"] }
  ]
}
```

Rules:

- Round 1 may ask 1-3 concise questions.
- Round 2 is only allowed when ambiguity still blocks good cards.
- Round 2 should be rare; `maxRounds` hard-capped at 2.

### 3.3 Card generation request payload

```json
{
  "inputText": "string",
  "categoryName": "string",
  "categorySlug": "string",
  "tags": ["string"],
  "socraticEnabled": true,
  "qaContext": [],
  "existingCards": [],
  "editInstruction": "string"
}
```

### 3.4 Card generation response payload

```json
{
  "cards": [
    {
      "front": "string",
      "back": "string",
      "selectedByDefault": true,
      "cardType": "direct_qa|cloze_contextual|context_recall|reverse_prompt|importance"
    }
  ]
}
```

---

## 4) Generation Rules

The system prompt enforces:

- One core fact/concept per generated set.
- 2-4 cards by default, with discretion for fewer.
- At least one direct question card and one contextual cloze card when feasible.
- No unrelated fact injection.
- Short, answerable, non-redundant fronts.

Post-processing rules:

- Deduplicate front/back pairs after normalization.
- Enforce style coverage by adding fallback cards if missing:
  - direct question
  - contextual cloze
- `New Word+` adds a context-recall style card if absent.

---

## 5) Category Behavior

### 5.1 `New Word`

- For single-token input, default to `New Word`.
- Focus on lexical meaning and practical usage.

### 5.2 `New Word+`

Use when the learner wants the context/story/quote remembered too.

Examples:

- "What did X say in Y?"
- Context cloze using phrase usage setup.
- Prompt asking for memorable usage scenario tied to phrase/word.

---

## 6) Socratic UX Flow

1. User enters input and category.
2. If Socratic enabled and no round yet -> request round 1.
3. If round 1 returns `needsFollowUp=true` and questions exist -> allow one round 2.
4. Otherwise generate cards immediately.
5. After cards render, user can send `editInstruction` to regenerate.

---

## 7) User-Configurable Category Policy (Future Frontend Scope)

When backend policy APIs are available, expose per-category controls:

- `targetCardCount` (int)
- `requiredCardStyles` (array)
- `creativityLevel` (1-4)
- `deviationAllowance` (1-4)
- `sourcePreference` (future integration placeholder)
- `socraticModeDefault` (bool)
- `maxSocraticRounds` (1-2)
- `newSessionDefaultCategoryId` (user-selected startup default category)

The New screen should read effective policy and apply it before each generation request.

---

## 8) Validation Matrix

- Fact sentence input -> direct + cloze + varied-but-same-fact cards.
- New Word+ input -> includes context-recall behavior.
- Ambiguous input -> optional round 2 triggered; common inputs remain single-round.
- Narrow input -> fewer cards allowed with discretion.
- Regeneration prompt -> same core fact maintained unless user requests rewrite.
