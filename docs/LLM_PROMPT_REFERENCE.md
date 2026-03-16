# LLM Prompt Reference — Where to Find Current Prompts

**Last updated**: 2026-03-15

This document maps where all LLM prompts and context instructions live in the codebase.

---

## 1. Main Shared Context (All Categories)

### Location
- **Primary (API Server)**: `api-server/server.js` lines 126-141
- **Frontend Copy**: `src/lib/llm/promptContext.ts` lines 1-16

### Content
`SHARED_CORE_CONTEXT` — The core flashcard generation doctrine:
- Active recall and minimum-information principles
- One core answer per note rule
- Deep attributes as metadata, not separate facts
- Never use true/false or multiple choice
- Handling overloaded inputs

**Key rules:**
1. Each card must test the EXACT SAME core answer in different ways
2. Never split one note into separate facts across multiple cards
3. Never put conversational text or chat responses in card content
4. Deep attributes appear on EVERY card if selected

---

## 2. Category-Specific Context

### Location
- **Primary (API Server)**: `api-server/server.js` lines 143-253
- **Frontend Copy**: `src/lib/llm/promptContext.ts` lines 18-128

### Content
`CATEGORY_CONTEXT` — Detailed instructions for each category:

#### Available Categories

1. **`new-word`** (lines 144-154)
   - 3 cards: contextual cloze → definition/scenario → association
   - Focus: One word, usable not just familiar

2. **`new-word-plus`** (lines 155-167)
   - 3 cards with source/context emphasis
   - Atomic bundle: word + memorable source

3. **`fact`** (lines 168-178)
   - Up to 3 cards: direct recall → contextual cloze → application
   - One proposition/claim/relationship

4. **`technical-definition`** (lines 179-189)
   - 3 cards: concept → cloze → contrast
   - Domain-specific term with precision

5. **`joke`** (lines 190-198)
   - 1 card (default): performable unit
   - No explanation cards

6. **`virtue-life-lesson`** (lines 199-209)
   - 3 cards: scenario → source → application
   - One principle with significance

7. **`quote-proverb-verse`** (lines 210-219)
   - 2 cards: cue → recitation, completion → phrase
   - High fidelity wording

8. **`contrast-pair`** (lines 220-230)
   - 3 cards: discrimination → scenario → correction
   - One target strengthened by contrast

9. **`formula-rule`** (lines 231-241)
   - 3 cards: direct recall → completion → application
   - One formula/law/heuristic

10. **`procedure-workflow`** (lines 242-252)
    - Up to 3 cards: cue → next-step → cloze
    - One short cohesive procedure

---

## 3. Rejection/Overload Context

### Location
- **Primary (API Server)**: `api-server/server.js` lines 255-259
- **Frontend Copy**: `src/lib/llm/promptContext.ts` lines 130-134

### Content
`REJECTION_CONTEXT` — Fallback for overloaded inputs:
- Generates single rejection card
- Front: "This note is overloaded."
- Back: "Too much information..."

---

## 4. Abuse Prevention Context

### Location
- **Primary (API Server)**: `api-server/server.js` lines 261-275
- **Frontend Copy**: `src/lib/llm/promptContext.ts` lines 136-150

### Content
`ABUSE_PREVENTION_CONTEXT` — Scope control and enforcement:
- One atomic learning target per note
- Small structured bundles allowed (2-5 tightly related items)
- Deep attributes are supporting metadata, not separate facts
- Block large lists, long passages, entire chapters

---

## 5. System Prompt Assembly

### Location
- **API Server**: `api-server/server.js` lines 282-299
- **Frontend**: `src/lib/llm/promptContext.ts` lines 164-181

### Function
`buildGenerationSystemPrompt(categorySlug)` — Assembles the full system prompt:

```javascript
return [
  SHARED_CORE_CONTEXT,
  getCategoryPromptContext(categorySlug),
  REJECTION_CONTEXT,
  ABUSE_PREVENTION_CONTEXT,
  `Return JSON only with shape: { "noteSpec": {...}, "cards": [...] }`
].join('\n\n');
```

---

## 6. User Prompt (Card Generation)

### Location
- **API Server**: `api-server/server.js` lines 656-670

### Content
The user prompt sent to OpenAI for card generation includes:
- `Input` — User's input text
- `CategoryName` / `CategorySlug`
- `Tags`
- `SocraticEnabled` — Whether Socratic questioning was used
- `QAContext` — Socratic question answers
- `ExistingCards` — For regeneration
- `EditInstruction` — User's refinement requests
- `GenerationConfig` — Creativity, target card count, custom instructions
- `NoteSpec` — Pre-built context with coreAnswer, selectedDeepAttributes

**Key addition (lines 667-670):**
```
NoteSpec (pre-built context):
${JSON.stringify(noteSpec, null, 2)}

Return noteSpec + cards following the exact rules above. 
Each card must test the SAME core answer (${noteSpec.coreAnswer}) in different ways. 
Never put conversational responses or explanations in card content - only quiz material.
```

---

## 7. Category Doctrine (Metadata)

### Location
- **API Server**: `api-server/server.js` lines 48-124

### Content
`CATEGORY_DOCTRINE` — Configuration for each category:
- `exactnessMode` — 'term_exact', 'phrase_exact', or 'gist'
- `targetCardCount` — Default number of cards
- `deepAttributesSupported` — Which attributes apply (source, context, significance, etc.)
- `deepAttributesStronglyPrompted` — Which to always include if not marked unimportant

Example:
```javascript
'new-word': {
  slug: 'new-word',
  exactnessMode: 'term_exact',
  targetCardCount: 3,
  deepAttributesSupported: ['source', 'context', 'significance', 'contrast'],
  deepAttributesStronglyPrompted: [],
}
```

---

## 8. Socratic Questions (Currently Hardcoded)

### Location
- **API Server**: `api-server/server.js` lines 318-382

### Status
**Currently hardcoded** — not LLM-driven (yet).

See `docs/LLM_DRIVEN_SOCRATIC_SPEC.md` for proposal to make these LLM-generated.

Current implementation:
- `getSocraticStage(round)` — Returns 'context', 'structure', or 'disambiguation'
- `buildCategoryAwareQuestions(input)` — Generates hardcoded questions based on category and round

---

## Quick Reference Table

| Prompt Component | API Server File | Frontend File | Line Range |
|------------------|-----------------|---------------|------------|
| Shared Core Context | `api-server/server.js` | `src/lib/llm/promptContext.ts` | 126-141 / 1-16 |
| Category Context | `api-server/server.js` | `src/lib/llm/promptContext.ts` | 143-253 / 18-128 |
| Rejection Context | `api-server/server.js` | `src/lib/llm/promptContext.ts` | 255-259 / 130-134 |
| Abuse Prevention | `api-server/server.js` | `src/lib/llm/promptContext.ts` | 261-275 / 136-150 |
| System Prompt Builder | `api-server/server.js` | `src/lib/llm/promptContext.ts` | 282-299 / 164-181 |
| User Prompt Assembly | `api-server/server.js` | N/A | 656-670 |
| Category Doctrine | `api-server/server.js` | N/A | 48-124 |
| Socratic Questions | `api-server/server.js` | N/A | 318-382 |

---

## How to Update Prompts

1. **Edit the API server**: `api-server/server.js` (primary source of truth)
2. **Keep frontend in sync**: `src/lib/llm/promptContext.ts` (mostly for reference/documentation)
3. **Test locally**: `cd api-server && npm run dev`
4. **Deploy**: Push to GitHub, redeploy LLM API service on Railway

---

## Testing a Prompt Change

```bash
# 1. Start API server locally
cd api-server
npm run dev

# 2. Test with curl
curl -X POST http://localhost:3001/api/llm/generate-cards \
  -H "Content-Type: application/json" \
  -d '{
    "inputText": "mitochondria",
    "categoryName": "New Word",
    "categorySlug": "new-word",
    "tags": [],
    "socraticEnabled": false,
    "qaContext": []
  }'

# 3. Check response quality
# Look for: correct card count, proper front/back structure, no chat responses
```

---

## Related Documentation

- `docs/LLM_DRIVEN_SOCRATIC_SPEC.md` — Proposal to make Socratic questions LLM-driven
- `docs/FRONTEND_API_SPEC.md` — Full API documentation
- `docs/FSRS_REFERENCE.md` — FSRS scheduling algorithm (not LLM-related)
- `docs/DECISION_LOG.md` — Historical decisions about LLM integration
