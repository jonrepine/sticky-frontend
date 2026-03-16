# LLM-Driven Socratic Questions Specification

**Status**: Proposed  
**Priority**: Medium  
**Last updated**: 2026-03-15  
**Issue**: Socratic questions are currently hardcoded and don't adapt to user input

---

## Problem Statement

Current implementation (`api-server/server.js` lines 324-382):
- Questions are **hardcoded** based on category and round number
- Same questions appear regardless of what the user actually typed
- No contextual awareness of the input's ambiguity, completeness, or clarity
- Generic fallbacks like "What single thing should this note help you recall later?"

**Example of poor UX:**
- User input: "mitochondria"
- Hardcoded question: "Where did you encounter this?"
- Better question (context-aware): "Do you mean the organelle, or are you learning this term in a specific context like 'mitochondrial DNA' or 'mitochondrial disease'?"

---

## Proposed Solution

Make Socratic questions **LLM-generated** with hardcoded **guardrails and suggestions** to guide the LLM.

### System Prompt for Socratic Question Generation

```
You are a Socratic questioner for a flashcard app. Your job is to ask the user SHORT, TARGETED questions to clarify what they want to remember.

RULES:
1. Ask only for MISSING information that affects card quality
2. Keep questions under 15 words
3. Provide 2-4 multiple-choice options when possible
4. Never ask questions the user already answered in their input or previous QA
5. Stop after 2 rounds unless critical ambiguity remains

CONTEXT-AWARE QUESTIONING:
- If input is vague (e.g., single word with multiple meanings), ask for disambiguation
- If input is overloaded (multiple facts), ask which ONE thing to remember
- If source/context would improve recall, ask "Where did you encounter this?"
- If exactness matters (definitions, formulas), confirm precision needs

CATEGORY-SPECIFIC GUIDANCE:
${categoryContext}

Return JSON:
{
  "needsFollowUp": boolean,
  "reason": "string (1 sentence explaining why follow-up is needed)",
  "questions": [
    {
      "id": "string (e.g., 'meaning-check', 'source-check')",
      "text": "string (the question)",
      "options": ["option1", "option2", "option3"] // optional
    }
  ]
}

If no questions needed, return: { "needsFollowUp": false, "reason": "Input is clear and complete", "questions": [] }
```

### User Prompt Template

```
Input: ${inputText}
Category: ${categoryName} (${categorySlug})
Round: ${round} of ${maxRounds}
Previous QA Context: ${JSON.stringify(qaContext)}

Based on the input and category, generate 1-3 short Socratic questions to clarify what the user wants to remember. Focus on missing context that would improve card quality.

If the input is already clear and complete, return needsFollowUp: false.
```

---

## Hardcoded Guardrails (Keep These)

These should remain **deterministic** and not LLM-driven:

### 1. Overload Detection (Keep Hardcoded)

```javascript
const overloaded = isLikelyOverloadedInput(inputText);
if (overloaded && !hasNarrowingSignal(qaContext)) {
  return {
    needsFollowUp: true,
    reason: 'Input appears overloaded',
    questions: [
      {
        id: 'atomicity-check',
        text: 'What single thing should this note help you recall later?',
        options: ['One term', 'One proposition', 'One formula/rule', 'One short sequence']
      }
    ]
  };
}
```

**Why keep this hardcoded?** Prevents LLM from encouraging multi-fact cards, which violates the core doctrine.

### 2. Round Limit (Keep Hardcoded)

```javascript
if (round >= maxRounds) {
  return {
    needsFollowUp: false,
    reason: 'Reached configured Socratic round cap',
    questions: []
  };
}
```

**Why keep this hardcoded?** Prevents infinite loops if LLM keeps asking questions.

### 3. Category-Specific Hints (Pass to LLM as Context)

Instead of hardcoding specific questions, pass **suggested question types** to the LLM:

```javascript
const CATEGORY_HINTS = {
  'new-word': `Suggested questions:
    - Ask for the word's meaning if ambiguous
    - Ask for source/context if it would aid recall
    - Ask for usage example if definition alone isn't memorable`,
  
  'technical-definition': `Suggested questions:
    - Ask for domain/field if not obvious
    - Ask for contrast with similar terms if confusion likely
    - Ask for source if technical precision matters`,
  
  'fact': `Suggested questions:
    - Ask for source if it would strengthen belief
    - Ask for context if the fact is situation-dependent
    - Ask for significance if it's not obvious why this matters`,
  
  // ... etc for other categories
};
```

---

## Implementation Plan

### Phase 1: Hybrid Approach (Recommended First Step)

Keep hardcoded overload detection + round limits, but make the **question content** LLM-generated:

```javascript
async function buildSocraticQuestions(input) {
  // 1. Hardcoded guardrails
  if (input.round >= input.maxRounds) {
    return { needsFollowUp: false, reason: 'Max rounds reached', questions: [] };
  }
  
  const overloaded = isLikelyOverloadedInput(input.inputText);
  if (overloaded && !hasNarrowingSignal(input.qaContext)) {
    return { /* hardcoded atomicity check */ };
  }
  
  // 2. LLM-generated questions
  if (hasApiKey) {
    try {
      return await generateSocraticQuestionsViaLLM(input);
    } catch (err) {
      console.error('LLM Socratic generation failed:', err);
      // Fall back to hardcoded questions
    }
  }
  
  // 3. Fallback: hardcoded questions (current implementation)
  return buildCategoryAwareQuestions(input);
}
```

### Phase 2: Full LLM (Future)

Once confident in LLM behavior, remove hardcoded question content entirely. Keep only overload detection and round limits.

---

## Example Comparisons

### Current (Hardcoded)

**Input:** "React useEffect"  
**Question:** "Where did you encounter this? Should we track source/context for better recall?"

Generic, ignores that this is a hook with dependency array nuances.

### Proposed (LLM-Driven)

**Input:** "React useEffect"  
**LLM Question:** "Are you learning the basic concept, or a specific pattern like 'cleanup functions' or 'dependency array rules'?"

Context-aware, helps user narrow to one atomic concept.

---

### Current (Hardcoded)

**Input:** "photosynthesis"  
**Question:** "What does this word mean in simple terms?"

Assumes user doesn't know definition (they might!).

### Proposed (LLM-Driven)

**Input:** "photosynthesis"  
**LLM Question:** "Are you learning the overall process, or a specific stage like light reactions or the Calvin cycle?"

Adapts to likely overload scenario.

---

## Benefits of LLM-Driven Approach

1. **Context-aware**: Questions adapt to what user actually typed
2. **Fewer unnecessary questions**: LLM can skip questions when input is already clear
3. **Better disambiguation**: LLM understands domain nuances (e.g., "Python" = snake vs programming language)
4. **Extensible**: No need to hardcode questions for every new category
5. **Natural language**: Questions feel less robotic

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM asks too many questions | Hardcode round limit (already exists) |
| LLM encourages multi-fact cards | Hardcode overload detection (keep it) |
| LLM asks irrelevant questions | Refine system prompt with clear guardrails |
| LLM fails / rate limited | Fall back to hardcoded questions |
| Increased latency | Cache common patterns, optimize prompt length |

---

## Testing Checklist

- [ ] LLM generates relevant questions for ambiguous input (e.g., "Python")
- [ ] LLM skips questions when input is clear and complete
- [ ] Hardcoded overload detection still triggers for long inputs
- [ ] Round limit still enforced (max 2-3 rounds)
- [ ] Fallback to hardcoded questions works when LLM fails
- [ ] Questions are under 15 words and easy to answer

---

## Related Files

- `api-server/server.js` lines 318-382 (current hardcoded implementation)
- `api-server/server.js` lines 570-599 (`/api/llm/socratic-questions` route)

---

## Decision

**Recommendation**: Implement Phase 1 (hybrid approach) immediately.

Keep hardcoded guardrails, but generate question content via LLM using the system prompt template above.
