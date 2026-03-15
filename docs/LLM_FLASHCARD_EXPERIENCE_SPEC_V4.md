# LLM Flashcard Experience Spec V4

Last updated: 2026-03-08  
Status: Proposed (spec + implementation plan)

---

## 1) Why V4

Current behavior already asks for "one core fact," but this is enforced mostly by prompt guidance.  
In practice, models can still return cards that test separate facts from the same paragraph.

V4 goal: make "same fact(s), asked in different ways" a first-class constraint across prompting, UX, and validation.

---

## 2) Evidence-Based Learning Principles (Operationalized)

The generation strategy should explicitly apply:

1. Retrieval practice improves long-term retention over re-reading.
2. The testing effect is stronger when retrieval cues vary but target memory stays stable.
3. The generation effect helps when the learner reconstructs missing content (cloze, reverse prompts).
4. Elaboration helps when prompts ask meaning/context without drifting to unrelated facts.
5. Minimal-information style reduces overload: one atomic target per set unless user explicitly requests a multi-fact cluster.

Primary references:

- Roediger & Karpicke (2006), Psychological Science: test-enhanced learning.
- Karpicke & Blunt (2011), Science: retrieval practice > elaborative study.
- Slamecka & Graf (1978), Journal of Experimental Psychology: generation effect.
- SuperMemo 20 rules (minimum information principle).

---

## 3) Core Constraint: Fact Anchor Contract

### 3.1 Required generation contract

All cards in a generated set must map to the same `factAnchor`:

- `factAnchor`: one sentence canonical statement of the targeted memory.
- `angle`: how card asks that same anchor (direct QA, cloze, reverse, scenario).
- `scopeReason`: short reason why this card still targets the same anchor.

The LLM response should include this metadata (internal; hidden from users by default):

```json
{
  "factAnchor": "Coronary arteries supply oxygen-rich blood to heart muscle.",
  "cards": [
    {
      "front": "...",
      "back": "...",
      "cardType": "direct_qa",
      "angle": "definition",
      "scopeReason": "Asks same supply relationship"
    }
  ]
}
```

### 3.2 Hard guardrail

If card-level `scopeReason` or content indicates drift to independent facts, trigger one auto-regeneration with corrective prompt:

- "These cards drifted from one anchor. Rewrite all cards to test only this anchor."

If still failing after retry:

- return cards with warning flag for UI ("low coherence"), and suggest user refine.

---

## 4) Socratic Flow V4 (Two-stage default, third round optional)

### Round 1 (Context grounding; required when Socratic is on)

Purpose: understand what the user saw/heard and in what context, assuming minimal prior knowledge.

Collect:

- source context ("where read/heard?")
- who/what source ("speaker/book/video/article")
- intent ("what do you want to remember from this?")

### Round 2 (Learning target + structure)

Purpose: disambiguate what portion of the anchor matters and how cards should test it.

Collect:

- exact sub-focus (definition, usage, implication, quote wording)
- preferred card mix (direct, cloze, context recall)
- strictness vs creativity expectation

### Round 3 (Optional, rare; only if ambiguity remains)

Purpose: resolve unresolved ambiguity that blocks high-quality generation.

Rule:

- only allowed when model provides explicit reason.
- capped by policy (`maxSocraticRounds`, range 1-3).

---

## 5) UX/Settings Additions

## 5.1 Creativity level with user blurbs

Display 4 levels with always-visible explanation text:

- `1 - Literal`: minimal paraphrase, safest wording, low novelty.
- `2 - Balanced`: modest phrasing variation, still close to source.
- `3 - Expressive`: more varied prompts/examples, may reframe wording.
- `4 - Exploratory`: widest variety while preserving anchor; highest rewrite freedom.

## 5.2 Strictness/deviation level with user blurbs

Display 4 levels with clear implication:

- `1 - Anchor-locked`: near-zero deviation; strict same-fact testing.
- `2 - Tight`: small paraphrase allowed, no factual expansion.
- `3 - Flexible`: allows contextual framing if still same anchor.
- `4 - Broad`: highest permissible reframing before considered drift.

## 5.3 Fill-in-the-blank preference

New toggle:

- "Include a fill-in-the-blank card"
  - ON: require at least one cloze when feasible.
  - OFF: cloze optional.

## 5.4 Custom LLM instructions

New multiline field per category policy:

- `customInstructions` (stored server-side and applied at generation time).
- UI helper text: "Use this to enforce personal style/context rules."

Example (New Word+):

- "Ask where I heard/read it and in what context. Make one card test exact quote/context recall."

---

## 6) New Word+ Review and updated default behavior

`New Word+` should prioritize context memory, not only lexical definition.

Default Socratic behavior:

- round 1 asks origin/context first.
- round 2 asks what part of context must be remembered (exact quote, scene, speaker, nuance).
- include at least one context-recall card style.

---

## 7) Frontend Integration Contract (Proposed)

Add to generation payloads:

```json
{
  "generationConfig": {
    "targetCardCount": 3,
    "creativityLevel": 2,
    "deviationAllowance": 1,
    "requiredCardStyles": ["direct_qa"],
    "includeClozeCard": true,
    "customInstructions": "string",
    "maxSocraticRounds": 3
  }
}
```

Socratic endpoint should return:

```json
{
  "round": 1,
  "stage": "context|structure|disambiguation",
  "needsFollowUp": true,
  "reason": "string",
  "questions": []
}
```

---

## 8) Frontend Implementation Plan

### FE-1 Prompt + response contract update

- Add `factAnchor`, `angle`, `scopeReason` to internal generation schema.
- Update proxy prompts with explicit evidence-based constraints.

### FE-2 Coherence validator

- Implement post-generation same-anchor check.
- If failed, run one auto-repair regeneration pass.

### FE-3 New Socratic orchestration

- Stage-based rounds: context -> structure -> optional disambiguation.
- Allow max rounds up to 3 from policy.

### FE-4 Settings UX expansion

- Add blurbs for creativity + strictness levels.
- Add "include cloze" toggle.
- Add `customInstructions` field.

### FE-5 New Word+ defaults and QA

- Pre-fill New Word+ system instruction template.
- Validate context-first questioning path in integration tests.

---

## 9) Frontend Test Plan

1. Input with multiple clauses still yields same-anchor card set.
2. Coherence validator catches independent-fact drift and retries once.
3. Creativity/strictness blurbs render and persist correctly.
4. Cloze toggle ON guarantees cloze; OFF does not force it.
5. Custom instructions persist and affect output.
6. New Word+ asks context-first in round 1 and generates context-recall card.

