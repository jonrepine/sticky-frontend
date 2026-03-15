# Sticky Frontend Agent Context

This file captures the product north star and default decision rules for this repository.

Canonical reference:
- `docs/PRODUCT_NORTH_STAR.md`
- `docs/UX_DESIGN_SPEC_V2.md`

If these documents conflict, prefer `docs/PRODUCT_NORTH_STAR.md`.

## Product North Star

Sticky should let a consumer capture a fact with near-zero friction, let the LLM do the planning, and then make review just as effortless when cards are due.

Core loop:
1. Learn something.
2. Paste or type the minimum possible input.
3. Let the LLM generate good flashcards.
4. Return later and review whatever is due without setup or decision fatigue.

## Primary Users

1. A casual learner entering a single word and expecting the app to infer the rest.
2. A high-volume learner, especially a medical student, pasting facts from source material in a split-screen workflow.

## Product Principles

- Optimize for fewer taps, less typing, and less thinking.
- The default landing screen is always the new-fact capture experience.
- The main value is fast capture and fast review, not deep card management.
- Prefer strong defaults over user configuration.
- Preserve flow state during an active session when it reduces repeated input.
- Use the same core interaction object across capture and review so the product feels coherent.
- The interface should feel plug-and-play, calm, and premium.
- Avoid drifting toward Anki-style complexity or dashboard-heavy clutter.

## UX Rules

- The first thing the user sees should be the primary input for a new fact.
- Review and learn flows should feel structurally similar to the main input flow.
- Editing, archiving, and maintenance flows are lower priority than capture and review.
- Keep a place on the home screen for future streak / daily consistency feedback, but do not let it overpower the capture flow.
- During an active session, preserve useful context like the last category when it helps rapid repeated entry.
- Tags should favor convenience over ceremony. Current preference: likely clear after save, but offer recent tags for quick re-selection.

## Brand Direction

- Apple-like in philosophy: usable immediately, minimal setup, sensible defaults.
- Anti-reference: Anki, where power comes with too much configuration overhead.
- Desired feeling: ease, simplicity, low cognitive load, no planning burden.
- Visual language: clean, restrained, card-centric, consistent, quietly premium, and explicitly compatible with a liquid-glass aesthetic.
- Strong preference: extremely simple UI first; liquid-glass is welcome only when it stays calm and uncluttered.

## Design Guardrails

- Do not introduce extra toggles, settings, or visible complexity unless clearly necessary.
- Do not make the interface feel technical for its own sake.
- Do not optimize secondary management screens at the expense of the core capture/review loop.
- When in doubt, choose the option that reduces cognitive load for a first-time or tired user.
