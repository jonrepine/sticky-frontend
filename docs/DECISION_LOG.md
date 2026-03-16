# Frontend Decision Log

## Chunk Status
- [x] Chunk 1 — Project scaffold + GraphQL client
- [x] Chunk 2 — Auth flow
- [x] Chunk 3 — Categories + Create InfoBit
- [x] Chunk 4 — InfoBit list + detail
- [x] Chunk 5 — Review session
- [x] Chunk 6 — Tags + Dashboard
- [x] Chunk 7 — Flags + Triage
- [x] Chunk 8 — Cards management
- [x] Chunk 9 — Settings + Polish (basic)
- [x] V2 IA Rebuild — New-first navigation and shell
- [x] V2 LLM Integration — Socratic + generation pipeline (local proxy)
- [x] V2 Learn/Review/My Cards primary surfaces
- [x] V2 Playground preserved and isolated
- [ ] Design system / brand identity (deferred)

---

## 2026-03-01 — Framework choice: Vite + React + TypeScript (web-first)
**Decision**: Use Vite + React + TypeScript for a web-first SPA instead of React Native or Expo.
**Why**: The immediate goal is testing the FSRS backend flow. A web app is fastest to iterate on. Can migrate to React Native later if mobile-first becomes the priority. Vite gives fast HMR and modern tooling.

## 2026-03-01 — UI library: Mantine v7
**Decision**: Use Mantine v7 as the component library.
**Why**: Provides polished, accessible components out of the box with dark mode support, excellent TypeScript integration, and minimal setup. Faster than building from scratch while still looking professional. Easy to swap out for a custom design system later.

## 2026-03-01 — GraphQL client: Apollo Client
**Decision**: Use Apollo Client over urql.
**Why**: Better ecosystem, more mature cache management, built-in support for token refresh via link chain. The `onError` link makes the auth refresh flow clean.

## 2026-03-01 — State management: React Context + Apollo cache
**Decision**: Use React Context for auth state and Apollo Client's normalized cache for server state. No Redux/Zustand.
**Why**: The app's client state is minimal (just auth). All data state lives on the server and Apollo cache handles it well. Adding a state library would be premature complexity.

## 2026-03-01 — Token storage: localStorage
**Decision**: Store JWT tokens in localStorage for V1.
**Why**: Simple and works for testing. In production, should migrate to httpOnly cookies or secure storage. Acceptable trade-off for a testing/development phase.

## 2026-03-01 — Project structure: Feature-based modules
**Decision**: Organize code by feature (`features/auth`, `features/infobits`, `features/review`, etc.) instead of by type (components, hooks, etc.).
**Why**: User specifically requested modular/independent functional pieces. Each feature folder contains its own GraphQL definitions, hooks, and page components. Features can be developed and tested independently.

## 2026-03-01 — LLM card generation: Deferred
**Decision**: Skip LLM integration for V1. Users create cards manually.
**Why**: User explicitly stated LLM implementation comes later. The architecture supports it — the `createInfoBit` mutation already accepts multiple cards, so LLM-generated cards can be plugged in without changing the data flow.

## 2026-03-01 — Design: Minimal, Mantine defaults with dark mode
**Decision**: Use Mantine's default dark theme with violet as primary color. No custom design system yet.
**Why**: User said "not too fussed about design" and wants to test the FSRS backend first. Design and brand identity will be specified later.

## 2026-03-01 — V2 IA: New-first navigation model
**Decision**: Move to a mobile-first primary nav of `Learn | New | Review | My Cards`, with `New` as startup route.
**Why**: The highest-frequency behavior is rapid capture while learning. Landing directly in New minimizes navigation friction and fits split-screen study behavior.

## 2026-03-01 — V2 LLM integration via local proxy
**Decision**: Implement Socratic questioning + card generation now, using a local server-side proxy in the frontend dev server instead of direct browser-to-OpenAI calls.
**Why**: This keeps API keys out of browser runtime and enables a production-like contract while maintaining fast local iteration.

## 2026-03-01 — Learn/Review component reuse
**Decision**: Build one reusable study session component and compose both Learn and Review from it.
**Why**: Shared rendering/rating logic reduces divergence, keeps behavior consistent, and makes backend queue-split migration straightforward.

## 2026-03-01 — Rating helper text semantics
**Decision**: Show pre-submit "next review in ..." helper text as **estimated** with current API, and define exact preview API additions in backend change spec.
**Why**: Current API provides exact `nextDueAt` only post-submit. Estimated labels improve UX now without pretending precision we do not yet have.

## 2026-03-14 — Unified floating dock for primary navigation
**Decision**: Replace the split footer-nav/workspace-pill setup with one shared floating dock that stays fixed across the authenticated app shell.
**Why**: The previous nav-inside-card layout made mobile reachability, continuous scrolling, adjacent-card staging, and tab transitions all fight each other. A single dock simplifies spacing, improves consistency, and matches the intended mobile-first interaction model.

## 2026-03-14 — Workspace screens animate as one route-driven deck
**Decision**: Route `Learn`, `New`, and `Review` through one persistent workspace route component and animate transitions with `framer-motion`.
**Why**: Keeping the same workspace component alive across section changes makes lateral card transitions and the moving dock indicator feel like one deck instead of page reloads. This also reduces duplication between swipe and tap navigation.

## 2026-03-14 — Workspace Stage lanes with external dock retained
**Decision**: Implement `WORKSPACE_STAGE_SPEC` geometry and lane architecture (`WorkspaceStage`, active lane, left/right preview lanes), while intentionally keeping the external floating dock as the only study-route section nav.
**Why**: The stage model fixes side-card spatial clarity and clipping drift, but product direction for this iteration keeps the dock outside the workspace card for fast cross-route access and consistent thumb navigation.

## 2026-03-14 — Geometry derived from active lane tokens
**Decision**: Derive preview size and peeks from active lane width tokens (`desktop min(52rem,100%)`, `mobile calc(100% - 20px)`) instead of ad-hoc translate percentages.
**Why**: Tokenized geometry keeps left/right spacing symmetric across breakpoints and prevents the “stacked behind” illusion that appears when preview offsets and widths are tuned independently.

## 2026-03-14 — My Cards moved from dock to burger menu
**Decision**: Keep the floating dock focused on `Learn`, `New`, and `Review`, and move `My Cards` access into the burger menu.
**Why**: This preserves a smaller, study-focused pill while still keeping card management accessible in app chrome.

## 2026-03-14 — Workspace previews extend to viewport edges
**Decision**: Refactor preview rendering into `WorkspacePreviewEdge` + `WorkspacePreviewWing`, and size desktop preview lanes against viewport width so side-card continuation reaches screen edges.
**Why**: The previous reveal-only mask caused visible hard cutoffs; the edge/wing split restores the intended “same workspace continuing outward” perception.

## 2026-03-14 — Workspace routes use full-bleed main container
**Decision**: For `/new`, `/learn`, and `/review`, render `AppShell.Main` at full width (no max-width side constraining) while keeping centered max-width behavior for non-workspace pages.
**Why**: Side preview wings are intended to continue to viewport edges; constraining the route container caused perceptual cutoff even when preview lane math was otherwise correct.

## 2026-03-14 — Remove hard edge clipping in desktop preview layer
**Decision**: Allow desktop `WorkspacePreviewEdge` to render beyond its click-mask boundary (`overflow: visible`) while preserving clipped behavior on compact screens.
**Why**: The hard edge mask on the clear preview layer created a visible cutoff seam. Letting the layer continue outward removes the clipped appearance while still preserving edge-focused interaction near the active card.

## 2026-03-14 — Prevent prompt-answer leakage before reveal
**Decision**: Stop showing the InfoBit title in the StudySession header before reveal, and keep the header neutral (`Front side` / `Answer revealed`).
**Why**: For vocabulary-style cards, the title often contains the answer. Showing it pre-reveal breaks the front/back study contract.

## 2026-03-14 — Desktop/tablet cards center; mobile keeps bottom-stick
**Decision**: Use centered vertical composition for `New` and `StudySession` on non-compact breakpoints, while keeping sticky bottom actions only on compact/mobile.
**Why**: Desktop and iPad layouts should feel balanced and card-centric, while mobile should remain thumb-reachable with bottom-anchored actions.

## 2026-03-14 — New capture controls grouped into calmer input block
**Decision**: Wrap the first `New` page controls (input, category, tags, Socratic toggle, generate actions) into one structured surface with increased spacing and breakpoint-specific layout.
**Why**: The previous controls felt visually clustered. Grouping and spacing improve scanability, reduce cognitive load, and create a cleaner modern capture flow.

## 2026-03-14 — All-caught-up state bottom-aligned on mobile
**Decision**: In `StudySession`, render the `All caught up` empty state with mobile bottom alignment (above dock clearance), while retaining centered alignment on larger screens.
**Why**: Mobile should preserve thumb-zone reachability and layout consistency with the rest of the study route behavior.

## 2026-03-14 — New screen status hierarchy separated from rhythm module
**Decision**: Move due status into its own top-left chip and keep `Daily rhythm` as a dedicated module that now hosts the streak visualization instead of mixed status/copy.
**Why**: Separating queue status from rhythm content reduces visual clutter and makes the first screen scan clearer.

## 2026-03-14 — Daily rhythm heatmap uses backend-accurate contract
**Decision**: Introduce a `dailyEngagement(windowDays)` API contract and frontend streak hook/component (`useDailyEngagement` + `StreakHeatmap`) instead of synthetic client-only heuristics.
**Why**: Business-facing consistency metrics need authoritative daily counts (add/learn/review) to avoid misleading intensity and streak representation.

## 2026-03-14 — Learn/Review routes require explicit state-aware queue API
**Decision**: Wire study queues through `dueQueue(kind)` semantics (`LEARN`, `REVIEW`, `ALL`) and surface a clear error when state-aware endpoints are unavailable for mode-specific views.
**Why**: True separation between Learn and Review should follow FSRS state rules and not rely on frontend guesswork.

## 2026-03-14 — Notification and control color roles normalized
**Decision**: Use purple for due-notification accents, green for card-selection checkboxes and flag-for-edit CTA, and improve light-mode surface contrast tokens.
**Why**: This aligns semantic color intent with UX expectations while improving readability in light mode without disturbing dark mode quality.

## 2026-03-14 — Heatmap horizon reduced to last 3 months
**Decision**: Scope the New-screen daily rhythm heatmap to a 90-day window and reflect that range in the label.
**Why**: A shorter horizon makes recent consistency easier to read and keeps the rhythm module focused on current behavior.

## 2026-03-14 — Dock icons optically lowered for centered alignment
**Decision**: Adjust pill dock icon rendering to remove inline baseline drift and apply a subtle downward optical correction.
**Why**: The Learn/New/Review icons were reading slightly high relative to text labels; optical centering improves polish and legibility.

## 2026-03-14 — Dock due indicators are queue-specific and mutation-refreshed
**Decision**: Drive Learn and Review dock indicators from separate `dueQueue(kind)` reads (`LEARN` and `REVIEW`) and refetch queue queries after each `submitReview`.
**Why**: A shared aggregate due count caused cross-route badge leakage, and missing post-review refetch left stale badges visible after the queue was completed.

## 2026-03-14 — Mobile rating controls stop sticking after reveal
**Decision**: Keep sticky action positioning only for the pre-reveal `Show Answer` CTA on compact screens; render revealed rating controls in normal flow.
**Why**: Sticky post-reveal controls could visually overlap answer content on mobile, reducing readability and causing “answer behind first option” behavior.

## 2026-03-14 — LLM generation normalized through NoteSpec with hard deep-attribute enforcement
**Decision**: Add a `NoteSpec`-first generation pipeline in the local LLM proxy and enforce hard rendering rules: one atomic core answer, front reminder when deep attributes are selected, and answer-first back bundle on every generated card.
**Why**: PM doctrine requires category-aware atomic recall with deep attributes attached to the same fact, not separate side cards. Enforcing this in normalization prevents drift regardless of model variability.

## 2026-03-14 — Category doctrine registry includes virtual categories with backend-safe mapping
**Decision**: Introduce a centralized category doctrine registry and expose additional PM categories in frontend flows as virtual categories, while mapping persistence to existing backend categories until first-class backend support lands.
**Why**: This unlocks immediate UX outcomes without blocking on backend schema rollout, while preserving compatibility with existing create/query contracts.

## 2026-03-14 — Socratic flow made deterministic and category-aware in proxy
**Decision**: Replace free-form Socratic question generation in the proxy with deterministic category-aware logic including atomicity checks, Anchor Check, Value Check, and overload narrowing behavior.
**Why**: Hard product constraints require predictable questioning and strict handling of overloaded captures; deterministic flow improves consistency and enforceability.

## 2026-03-14 — Forbidden recognition style removed from policy surface
**Decision**: Remove `true_false` from supported generation styles in settings/runtime normalization and expand style taxonomy to doctrine-aligned retrieval patterns.
**Why**: Recognition-heavy formats conflict with the retrieval-first learning doctrine and weaken memory outcomes.

## 2026-03-14 — Shared and category-specific LLM doctrine is always injected into generation prompt
**Decision**: Add `src/lib/llm/promptContext.ts` and compose OpenAI `systemPrompt` from four always-on layers: shared atomic-memory doctrine, category-specific behavior block, explicit overload rejection fallback, and abuse/scope-control policy.
**Why**: Generation quality should be governed by durable doctrine text, not only numeric config values. Explicit prompt layers reduce drift, keep category behavior consistent, and enforce overload handling even when user input is broad.

## 2026-03-14 — Canonical frontend API docs synced to V2 backend contracts
**Decision**: Update `docs/FRONTEND_API_SPEC.md` and `docs/API_ACTION_CATALOG.md` to include additive V2 contracts (`dueQueue`, `reviewOutcomePreview`, `dailyEngagement`) and doctrine-category rollout touchpoints.
**Why**: The implementation/spec state had diverged from the canonical frontend-facing docs, which risked stale handoffs and incorrect client assumptions during rollout.

## 2026-03-14 — Persist NoteSpec in backend-normalized shape on create
**Decision**: Add a frontend normalization step before `createInfoBit` persists `noteSpec`, mapping exactness and deep-attribute values to backend enum casing and ensuring reminder/max-facts fields remain valid.
**Why**: Frontend LLM pipeline uses lower-case doctrine tokens internally, while backend validation is enum-strict. Normalizing at persistence keeps local generation ergonomics while making save path contract-safe.

## 2026-03-14 — NoteSpec validator feedback is warning-only and feature-flag aware
**Decision**: Integrate `validateNoteSpec(infoBitId)` as a non-blocking post-save warning flow and gate attempts via `health.featureFlags.noteSpecValidator` when available (with tolerant fallback when flag metadata is hidden/unavailable).
**Why**: Product intent is to preserve low-friction capture while still surfacing quality issues. Blocking saves on validator state would create avoidable UX friction and environment-specific failures.

## 2026-03-14 — Review rating helper labels prefer rich outcome previews with fallback
**Decision**: Use `reviewOutcomePreview` display text for rating button helper labels when available, and fallback to existing `nextReviewCard.ratingPreviews` formatting when not.
**Why**: This provides higher-fidelity pre-submit guidance on capable backends while preserving compatibility with older deployments.

## 2026-03-15 — Railway Vite runtime explicitly allowlists hosted domains
**Decision**: Configure `vite.config.ts` with `server.allowedHosts` including `.railway.app`, the current Railway hostname, and optional extra hosts via `ALLOWED_HOSTS`.
**Why**: Running the frontend in Vite server mode on Railway requires host allowlisting; without it, requests are blocked before local LLM proxy routes can execute.
**Note**: This decision was later superseded by extracting LLM to standalone API server.

## 2026-03-15 — Standalone Node API server for LLM operations
**Decision**: Extract all LLM proxy logic from `vite.config.ts` into a standalone Express server in `api-server/` directory. Frontend builds as static bundle and calls API server via `VITE_LLM_API_URL`.
**Why**: Running Vite dev server in production caused HMR reconnect loops on mobile, slow startup, and instability. Standalone API server is faster, more stable, and proper production architecture.

## 2026-03-15 — Pill navigation always shows labels
**Decision**: FloatingDock component now shows labels for all sections (not just active), with visual weight difference (bold active, lighter inactive).
**Why**: User explicitly requested all labels to be visible for better navigation clarity.

## 2026-03-15 — Reduced mobile animations for performance
**Decision**: Simplified framer-motion animations on mobile (WorkspacePage): disabled idle drift animation, reduced transition durations, removed scale transforms, reduced blur effects.
**Why**: Mobile felt laggy and stuttery due to excessive animation complexity. Simpler animations improve performance while maintaining smooth feel.

## 2026-03-15 — Username required at signup, login accepts email or username
**Decision**: Make username mandatory during registration. Update `SignInInput` to use `emailOrUsername` field (backend detects type via `@` presence). Frontend label: "Email or Username".
**Why**: Improves user flexibility and matches common auth UX patterns. Usernames provide shorter, more memorable login identifiers.

## 2026-03-15 — Socratic questions are LLM-driven with hardcoded suggestions
**Decision**: Replace hardcoded Socratic question logic with LLM-generated questions. Current hardcoded questions serve as suggestions to the LLM in the system prompt. Hardcoded guardrails remain: overload detection and round limits. Falls back to hardcoded questions if LLM fails.
**Why**: LLM can adapt questions to user's actual input (e.g., "Python" → disambiguate snake vs programming). Current questions were good but generic. This makes them context-aware while preserving their quality as suggestions.

## 2026-03-15 — Contrast-pair prompt explicitly handles "word1 vs word2" pattern
**Decision**: Updated contrast-pair category prompt with explicit instructions: when user provides "term1 vs term2", LLM must (1) identify target vs contrast, (2) explain the key distinction, (3) include this distinction on EVERY card. The distinction is the central teaching point, not optional metadata.
**Why**: User feedback: contrast-pair cards weren't explicating what distinguishes the terms. The distinction explanation is the whole point of contrast-pair learning.
