# Frontend Error Journal

## 2026-03-01 — InfoBit list duplication while revisiting list page
**Symptom**: Opening InfoBit detail and returning to list duplicated items in the list.
**Cause**: Apollo cache merge for `infoBits` always appended incoming results, even on non-pagination refetches.
**Fix**: Updated merge policy to append only when `args.cursor` exists; otherwise replace incoming edges.
**Lesson**: Cursor pagination merge policies must branch by request intent (paginate vs refresh).

## 2026-03-01 — JSX parser error in New page badge text
**Symptom**: TypeScript compile failed with `Unexpected token` in `NewPage.tsx`.
**Cause**: JSX text contained a `->` pattern that parsed poorly in context.
**Fix**: Rewrote text to plain wording (`defaults to`) to avoid parser ambiguity.
**Lesson**: Keep JSX inline text simple; prefer plain words over symbolic arrows inside TSX nodes.

## 2026-03-01 — ESLint script failed due missing flat config
**Symptom**: `npm run lint` failed with `ESLint couldn't find an eslint.config.(js|mjs|cjs) file`.
**Cause**: Project used ESLint v9 but had no flat config file.
**Fix**: Added `eslint.config.js` and cleaned unused imports reported by lint.
**Lesson**: For ESLint v9+, initialize flat config early to keep CI checks stable.

## 2026-03-14 — Hook order lint failure after workspace stage refactor
**Symptom**: `npm run lint` failed in `WorkspacePage.tsx` with `React Hook "useMemo" is called conditionally`.
**Cause**: `useMemo` for fallback stage width was declared after an early return branch used for invalid section redirects, violating hook call order.
**Fix**: Removed the conditional `useMemo` usage and computed fallback geometry with plain constants before any conditional return path.
**Lesson**: In route-driven components with guard returns, keep all hook calls above guard branches or use non-hook computations for fallback values.

## 2026-03-14 — Dynamic section route shadowed static pages
**Symptom**: Single-segment routes such as `/my-cards` could be interpreted as workspace `:section`, causing unexpected redirects.
**Cause**: In `App.tsx`, `path=":section"` was defined before static routes.
**Fix**: Reordered routes so static paths (`my-cards`, `settings`, `playground`) are declared before `:section`.
**Lesson**: Keep static route declarations ahead of dynamic segments to avoid accidental capture.

## 2026-03-14 — Streak heatmap build failed on indexed color tuple lookup
**Symptom**: `npm run build` failed with `TS2322` in `StreakHeatmap.tsx` (`string | undefined` not assignable to `string`).
**Cause**: Color scales were inferred as generic arrays under strict indexed-access checks, so indexing with a level key returned a potentially undefined type.
**Fix**: Converted scale arrays to readonly tuples and added an explicit fallback return path in `getColorByLevel`.
**Lesson**: For strict TypeScript configs, tuple-typed palettes or explicit fallback guards avoid undefined index typing errors in UI token helpers.

## 2026-03-14 — Mobile review answer overlapped sticky rating controls
**Symptom**: On compact screens after reveal, answer content could slide behind the first rating button, making the back side hard to read.
**Cause**: The ratings container remained `position: sticky` post-reveal, so it overlaid content during scroll/viewport compression scenarios.
**Fix**: Scoped sticky positioning to pre-reveal only (`Show Answer`), and rendered revealed ratings in normal document flow.
**Lesson**: Sticky controls in study flows should be mode-aware; post-reveal content needs flow layout priority to preserve readability.

## 2026-03-14 — Learn-only due items showed badges on both Learn and Review
**Symptom**: A due item in Learn triggered notification dots on both Learn and Review dock pills, and badges could stay visible after catch-up.
**Cause**: The dock used one aggregate due count for both routes, and queue queries were not refetched after `submitReview`.
**Fix**: Switched dock badges to per-route queue counts (`dueQueue(kind: LEARN|REVIEW)`) and added `refetchQueries` on submit mutations.
**Lesson**: Route-specific badges must derive from route-specific data slices, and queue-mutating actions should refresh all dependent indicators.

## 2026-03-14 — Virtual category selection unintentionally inherited backend category policy overrides
**Symptom**: New frontend-only doctrine categories could unintentionally pick up backend policy overrides from their mapped persistence category, producing behavior that diverged from doctrine defaults.
**Cause**: `NewPage` requested and merged `generationPolicyByCategory` using the mapped backend category ID even for virtual category selections.
**Fix**: Virtual category selections now skip backend policy lookup/merge and use doctrine defaults directly, while still mapping persistence category IDs on save.
**Lesson**: Compatibility mappings for persistence should not silently reuse behavior policy unless explicitly intended; treat storage mapping and generation doctrine as separate concerns.

## 2026-03-14 — Canonical API docs drifted behind V2 backend contracts
**Symptom**: `FRONTEND_API_SPEC.md` and `API_ACTION_CATALOG.md` did not list `dueQueue`, `reviewOutcomePreview`, or `dailyEngagement`, creating conflicting frontend handoff guidance even though V2 specs and code had moved forward.
**Cause**: Contract changes were documented in V2/backend change specs but not propagated to the canonical frontend API references.
**Fix**: Added V2 review/queue/engagement sections to `FRONTEND_API_SPEC.md` and corresponding action rows + category rollout notes to `API_ACTION_CATALOG.md`.
**Lesson**: After any API-surface change, run a docs parity check across all canonical references rather than updating only implementation-adjacent specs.

## 2026-03-14 — Local NoteSpec token casing mismatched backend enum validation
**Symptom**: Frontend-generated `noteSpec` values used lower-case exactness/deep-attribute tokens, which risked backend validation failures once `createInfoBit(input.noteSpec)` became active.
**Cause**: Local doctrine model was intentionally lower-case for generation logic, while backend validation contract expects enum-style uppercase values.
**Fix**: Added a persistence normalization layer that maps local note spec payloads to backend enum casing before save.
**Lesson**: When adding structured JSON contracts to existing flows, verify not just field presence but canonical enum/value casing across service boundaries.

## 2026-03-14 — Optional health feature flags can break strict query assumptions
**Symptom**: Querying `health.featureFlags` can fail or return null across mixed deployments, risking validator-gating regressions.
**Cause**: Feature-flag metadata is environment-sensitive (non-production visibility, schema/version differences).
**Fix**: Added health-query fallback logic and kept note-spec validator feedback non-blocking with graceful failure behavior.
**Lesson**: Treat capability probes as optional in rolling deployments; never let diagnostics-only metadata block core user actions.
