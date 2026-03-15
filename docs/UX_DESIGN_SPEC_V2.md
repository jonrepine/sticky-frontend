# Sticky Frontend V2 — UX and Design Specification

Last updated: 2026-03-01
Status: Approved for implementation

---

## 0. Product Intent

Sticky V2 is designed around one high-frequency behavior:

**Learn something -> capture it quickly -> get high-quality cards -> study with FSRS.**

The first screen on both mobile and desktop is always the "New" capture experience. The interface must work in:

- one-handed mobile entry for a single word
- split-screen desktop use (Sticky on one side, source material on the other)

---

## 1. Information Architecture

## Primary Navigation (Bottom, mobile-first)

1. `Learn`
2. `New` (default and startup route)
3. `Review`
4. `My Cards`

The bottom nav is visible on mobile and tablet. On desktop, the same destinations are available in the side/nav shell.

## Secondary Navigation (Burger menu)

- Profile
- Settings
- Sign out
- Developer tools (Playground) grouped separately

---

## 2. Core Screen Specifications

## 2.1 New Screen (Primary Landing Screen)

### Purpose

Capture a word/fact/concept and generate cards with minimum friction.

### Layout

- Centered "capture card" component with:
  - main input (`What did you learn?`)
  - category selector
  - tags input
  - socratic toggle
  - "Generate cards" CTA
- Generated cards appear below as a horizontal/step carousel.
- Submit action saves selected cards as a new InfoBit.

### Behavior Rules

- If input is a single token (one word, no spaces/punctuation sequence), default category to `New Word`.
- Category defaults:
  - On fresh app session: `New Word`.
  - During the current app session: reuse last submitted category.
- Socratic toggle defaults to user's last selection and persists across sessions.
- After submit:
  - remain on New screen
  - keep category/tags/socratic configuration from last submit
  - clear primary input and generated cards

### Generated Cards UX

- Default target: 4 cards.
- Model may return fewer when content quality requires it (e.g. jokes, simple facts).
- Each generated card supports:
  - select/deselect for saving
  - inline edit of front/back
  - remove card
  - add custom card manually

### Socratic Mode UX

- When enabled, generation is a two-step flow:
  1. model asks clarifying questions
  2. user answers via chips/options or free text
- Then model generates cards using original input + Q/A context.

---

## 2.2 Learn Screen

### Purpose

Dedicated stage for fresh items in FSRS learning/relearning states before long-term review.

### V2 Frontend Behavior (current API constraints)

- Show items intended for immediate/short-interval learning.
- Use explicit labeling that Learn is best-effort partitioning until backend exposes direct state-aware due endpoints.
- Rating controls mirror Review screen.

---

## 2.3 Review Screen

### Purpose

Fast FSRS review loop for due items.

### Interaction Pattern

1. show prompt/front
2. reveal answer
3. rate `Again/Hard/Good/Easy`
4. proceed instantly to next item

### Rating Helper Text Requirement

Under each rating button, show:

- "Next review in ...", calculated from preview estimate or server-provided preview
- displayed before user taps rating

If exact preview is unavailable, show "estimated" label to avoid misleading precision.

---

## 2.4 My Cards Screen

### Purpose

Single management area for cards, including flagged content and editing workflows.

### Sections

- All InfoBits / cards (search + filter)
- Flagged queue (needs edit, low quality, etc.)
- Quick actions:
  - open detail
  - edit card content
  - archive/delete
  - resolve flags

---

## 2.5 Profile/Settings

### Purpose

Low-frequency account controls.

### Content

- username
- timezone
- account metadata
- scheduler settings (future expansion)

---

## 3. Visual Design System Direction

The UI should feel modern, clean, and premium while keeping implementation simple.

### Style Direction

- soft shadows and subtle depth
- rounded surfaces
- high-contrast typography
- tasteful gradients for primary CTA surfaces
- smooth transitions (150-250ms)

### Motion Principles

- route-level slide/fade transitions between primary tabs
- micro-interactions for:
  - toggles
  - card selection
  - submit success

### Libraries

- Mantine for component primitives
- tabler icons
- lightweight animation layer (Mantine transitions or framer-motion where needed)

---

## 4. Responsive Behavior

## Mobile

- New screen is card-first and thumb-reachable.
- Bottom nav fixed.
- Composer and generated cards optimized for short vertical scanning.

## Desktop

- New composer constrained width for split-screen workflows.
- Dense but readable list/cards in Learn/Review/My Cards.
- Keyboard shortcuts optional in future.

---

## 5. Session and Preference Model

### Persisted Across Sessions (localStorage)

- `socraticEnabled`

### Reset Per Session (sessionStorage/app-memory)

- default category starts as `New Word`
- last submitted category reused after first submit
- last used tags reused after submit in same session

---

## 6. Error and Empty States

- LLM errors:
  - actionable retry
  - keep user inputs and answers intact
- Empty review:
  - "All caught up" with CTA to New
- Empty my cards:
  - CTA to create first InfoBit

---

## 7. Accessibility Requirements

- keyboard navigable forms and card controls
- sufficient color contrast on rating states
- semantic labels for all toggles and buttons
- reduced-motion compatibility for transitions

---

## 8. Success Metrics

- Time from app open to first submit on New screen < 30s median.
- >= 90% of new InfoBits created from the New screen (not detail pages).
- Review interaction latency feels immediate (< 150ms local transitions).
- Socratic flow completion without abandonment improves generated card acceptance.

---

## 9. Out of Scope for This Iteration

- Full brand identity/theming system
- Native mobile app implementation
- Social/sharing flows
- Import/export from other systems

