# Sticky Product North Star

Last updated: 2026-03-14
Status: Active guidance for product, UX, and implementation decisions

## 1. Product Aim

Sticky exists to make memory capture and spaced review feel effortless.

The user should be able to:
- provide a fact, word, or copied passage with minimal typing
- let the LLM turn that input into useful flashcards
- come back later and immediately review whatever is due

The app should remove planning overhead. The user should not need to think hard about card structure, scheduling, or workflow setup.

## 2. Core Product Loop

1. The user learns or notices something worth remembering.
2. They open Sticky and enter the minimum possible input.
3. The LLM generates a small set of good flashcards.
4. The user saves them with little or no manual editing.
5. Later, the user returns and reviews due cards in a seamless flow.

This loop should feel faster and simpler than manually authoring flashcards in a traditional spaced-repetition tool.

## 3. Target Users

### User Type 1: Minimal-input learner

This user wants to type a single word, or a very short fact, and rely on the LLM to infer:
- meaning
- context
- example usage
- useful flashcard forms

They are not interested in setup, taxonomy, or manual card crafting.

### User Type 2: Split-screen high-volume learner

This user is often reading source material, such as a medical textbook, while Sticky is open on another screen.

They want to:
- paste a fact quickly
- generate cards immediately
- keep entering more facts in sequence
- avoid re-entering the same context repeatedly

This workflow is highly sensitive to friction. Repeated form filling is a product failure.

## 4. Jobs To Be Done

- "When I learn a new word, I want to capture it immediately without deciding how to phrase the card."
- "When I am reading dense material, I want to paste facts into a fast intake flow and let the app structure recall for me."
- "When I return later, I want review to be automatic and ready, not something I need to set up."

## 5. Product Philosophy

Sticky should feel closer to Apple than Android, Windows, or Anki.

That means:
- strong defaults
- immediate usability
- low visible complexity
- minimal customization pressure

Sticky should not feel like a power-user system that expects the user to design their own process.

Anti-reference:
- Anki, especially where flexibility creates setup cost, maintenance burden, and decision fatigue

## 6. Desired Feeling

The product should feel:
- effortless
- simple
- calm
- reliable
- premium

The user should feel that the app has already done the planning for them.

The user should not need to think about:
- how many cards to make
- what type of card to create
- how the fact should be tested
- when it should be shown again

## 7. Primary Screen Priority

The main screen should prioritize new fact entry above everything else.

Requirements:
- the default startup route is the new-fact screen
- the first thing the user sees is the main input surface
- the main input should support both short single-word input and longer pasted facts
- the capture experience should feel immediate throughout the day

The home screen may later include a compact streak or daily-review indicator, but that element must remain secondary to the capture input.

## 8. Core UX Principles

### 8.1 Minimize typing

Every unnecessary field, control, or repeated action harms the product.

Design and implementation should favor:
- pasting over manual formatting
- short labels
- remembered context
- single-tap follow-up actions

### 8.2 Minimize thinking

Do not ask the user to plan the study system. The app should do that.

Avoid:
- excessive toggles
- configuration-heavy flows
- too many visible options
- requiring users to decide card formats up front

### 8.3 Preserve flow state when it helps rapid capture

During a capture session, the app should reduce repeated work.

Current direction:
- preserve the last useful category during the session
- preserve other choices only when they clearly reduce friction
- tags likely should clear after save, but recent tags should be easy to reapply

### 8.4 Keep interaction objects consistent

The same core "card-like object" should anchor the main entry flow and the review flow.

That consistency should help the app feel:
- unified
- familiar
- low-friction

### 8.5 Prioritize the core loop over management tools

Editing, archiving, and InfoBit maintenance matter, but they are not the primary experience right now.

If there is tension between:
- improving capture/review
- polishing management screens

the capture/review path wins.

## 9. Screen Intent

### New

This is the most important screen in the app.

Purpose:
- capture a new fact fast
- let the LLM refine and generate cards
- save with minimal intervention

Design implications:
- the main input must dominate the hierarchy
- secondary controls should be quiet and low-friction
- the user should be able to enter repeated facts without reset fatigue

### Review / Learn

These screens should feel like direct siblings of the new-fact flow, not like a different product.

They should:
- reuse the same visual language
- preserve the same sense of focus and simplicity
- make due-card interaction immediate

### My Cards / Editing / Archiving

These are secondary workflows.

They should be competent and accessible, but they should not drive the product structure.

## 10. Brand and Visual Direction

Visual direction should be:
- clean
- restrained
- card-centric
- quietly premium
- compatible with a liquid-glass treatment when kept minimal and calm

The interface should not look:
- over-customizable
- overly technical
- busy
- dashboard-first
- like a generic AI-generated dark glass UI

The aesthetic should support trust and ease, not novelty for its own sake.

Explicit current preference:
- extremely simple UI
- liquid-glass style is welcome, but only in a restrained, premium, Apple-like way

## 11. Technical Product Guidance

Implementation decisions should support the north star.

### Prefer defaults over knobs

Only expose a setting when it produces clear user value in the core loop.

### Preserve convenience state intentionally

Retain state that reduces repeated input during active capture sessions.

### Reduce friction before adding power

Before adding more controls, first ask:
- does this remove user effort?
- does this speed up capture?
- does this speed up review?
- does this reduce confusion?

### Keep the initial experience lightweight

The main capture flow should load quickly and stay visually focused.

### Make the LLM feel like an assistant, not a configuration system

The user should feel that the model helps refine and structure knowledge, not that they are filling out a prompt builder.

## 12. Decision Heuristics For Future Work

When choosing between two options, prefer the one that:
- reduces typing
- reduces taps
- reduces visible complexity
- preserves session momentum
- keeps the new-fact screen dominant
- makes review feel immediate

Reject or heavily question changes that:
- add more setup before first value
- introduce clutter to the main screen
- require repeated manual cleanup
- make the product feel like a study-admin tool instead of a capture-and-review tool

## 13. Current Open Direction

These are not fully settled, but should guide near-term decisions:

- Keep category persistence during an active session when it helps repeated entry.
- Revisit whether tags should persist after save; current leaning is no, but recent tags should be surfaced for fast reuse.
- Add a reserved home-screen zone for streak / daily-review momentum later, without displacing the primary input.

## 14. Summary

Sticky should be the flashcard app that works out of the box.

The user should be able to think:
"I learned something, I dropped it in, and the system handled the rest."
