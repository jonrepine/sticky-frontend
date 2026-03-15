# User Action Catalog -> API Surface

Last updated: 2026-03-14

Purpose:
- Enumerate all front-end user actions that require API support.
- Verify data model supports each action.
- Mark delivery phase so v1 remains focused.

Legend:
- Phase `V1`: included in current backend scope.
- Phase `V1.1+`: planned later.
- Phase `V2`: additive contracts shipped or in active rollout for the V2 frontend.
- Phase `V2 rollout`: migration-period behavior while frontend virtual categories transition to first-class backend categories.

## A. Auth and Account

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Register account | `signUp` | V1 | `users`, `auth_identities`, `sessions` |
| Log in | `signIn` | V1 | `auth_identities`, `sessions`, `users` |
| Log out current device | `signOut` | V1 | `sessions` |
| Log out all devices | `signOutAllSessions` | V1 | `sessions` |
| Refresh expired access token | `refreshSession` | V1 | `sessions` |
| View own profile | `me` | V1 | `users` |
| Update username/timezone | `updateMe` | V1 | `users` |
| Change password (authenticated) | `changePassword` | V1.1+ | `auth_identities` |
| Request password reset | `requestPasswordReset` | V1.1+ | `auth_identities` |
| Reset password with token | `resetPassword` | V1.1+ | `auth_identities` |
| Verify email | `verifyEmail` | V1.1+ | `users`, `auth_identities` |
| Link Google identity | `linkAuthIdentity` | V1.1+ | `auth_identities` |
| Link phone OTP identity | `linkAuthIdentity` | V1.1+ | `auth_identities` |
| Delete own account | `deleteMe` | V1.1+ | soft-delete across user-owned entities |

## B. Categories and Tags

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| List categories (system + custom) | `categories` | V1 | `categories` |
| Create custom category | `createCategory` | V1.1+ | `categories` |
| Rename custom category | `updateCategory` | V1.1+ | `categories` |
| Archive custom category | `archiveCategory` | V1.1+ | `categories` |
| Delete custom category | `deleteCategory` | V1.1+ | `categories`, `info_bits` migration rule |
| List tags | `tags` | V1 | `tags` |
| Create/attach tags to InfoBit | `attachTags` | V1 | `tags`, `info_bit_tags`, Mongo tag mirror |
| Remove tags from InfoBit | `detachTags` | V1 | `info_bit_tags`, Mongo tag mirror |
| Archive one tag | `archiveTag` | V1 | `tags` |
| Delete one tag | `deleteTag` | V1 | `tags`, `info_bit_tags` |
| Archive many tags | `archiveTags` | V1 | `tags` |
| Delete many tags | `deleteTags` | V1 | `tags`, `info_bit_tags` |

### B.1 Category Doctrine Rollout (V2)

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| See first-class LLM doctrine categories in picker (when seeded) | `categories` | V2 rollout | `categories` |
| Continue creating InfoBits while doctrine categories are still virtual in frontend | `createInfoBit` with mapped `categoryId` | V2 rollout | `info_bits`, frontend mapping layer |
| Configure category generation behavior for doctrine categories | `upsertSchedulerPolicy(scope=CATEGORY)` + frontend doctrine defaults | V2 rollout | `scheduler_policies`, frontend doctrine registry |

Tag behavior note:
- `archiveTag` / `deleteTag` and bulk variants should accept `cascadeToInfoBits: Boolean = false`.
- Default behavior (`false`) does not cascade InfoBit lifecycle updates.

## C. InfoBit CRUD and Lifecycle

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Create InfoBit with cards | `createInfoBit` | V1 | `info_bits`, `cards`, Mongo `infobit_contents`, `activity_events` |
| Create InfoBit with normalized note metadata | `createInfoBit(input.noteSpec)` | V2 rollout | `info_bits.note_spec_json` (proposed), validation helpers |
| View one InfoBit | `infoBit` | V1 | SQL + Mongo hydrate |
| Read normalized note metadata for quality/migration tooling | `infoBit.noteSpec`, `infoBits.noteSpec` | V2 rollout | `info_bits.note_spec_json` (proposed) |
| List InfoBits with filters | `infoBits` | V1 | `info_bits`, `categories`, `info_bit_tags`, `tags` |
| Update InfoBit title/category/tags | `updateInfoBit` | V1 | `info_bits`, `info_bit_tags`, Mongo mirror |
| Archive one InfoBit | `archiveInfoBit` | V1 | `info_bits`, `activity_events` |
| Delete one InfoBit (soft) | `deleteInfoBit` | V1 | `info_bits`, related children soft handling |
| Mark InfoBit mastered | `markInfoBitMastered` | V1 | `info_bits`, `activity_events` |
| Bulk archive InfoBits | `archiveInfoBits` | V1 | `info_bits` |
| Bulk delete InfoBits | `deleteInfoBits` | V1 | `info_bits` |
| Restore archived InfoBit | `restoreInfoBit` | V1.1+ | `info_bits` |
| Restore deleted InfoBit | `restoreInfoBit` | V1.1+ | `info_bits` |

## D. Card CRUD and Lifecycle

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Add card to InfoBit | `addCard` | V1 | `cards`, Mongo cards array |
| Edit card content | `updateCardContent` | V1 | Mongo cards array, `cards.content_version`, `activity_events` |
| Archive one card | `archiveCard` | V1 | `cards`, Mongo card status |
| Delete one card (soft) | `deleteCard` | V1 | `cards`, Mongo card status |
| Bulk archive cards | `archiveCards` | V1 | `cards`, Mongo card statuses |
| Bulk delete cards | `deleteCards` | V1 | `cards`, Mongo card statuses |
| Restore card | `restoreCard` | V1.1+ | `cards`, Mongo card status |
| Reorder cards in InfoBit | `reorderCards` | V1.1+ | Mongo cards array |

## E. Review and Learning Flow

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Fetch due InfoBits | `dueInfoBits` | V1 | `fsrs_card_states`, `info_bits` |
| Fetch queue-partitioned due items for Learn/Review tabs | `dueQueue(kind: LEARN|REVIEW|ALL)` | V2 | `fsrs_card_states`, `info_bits` |
| Start review for one InfoBit | `nextReviewCard` | V1 | `cards`, Mongo content, rotation metadata |
| Preview all 4 rating outcomes before submit | `reviewOutcomePreview(input)` | V2 | FSRS engine read path, `fsrs_card_states` |
| Submit rating/result | `submitReview` | V1 | `fsrs_review_logs`, `fsrs_card_states`, `info_bits.due_at`, `cards.last_reviewed_at`, Mongo rotation |
| Fetch daily engagement counts for rhythm heatmap | `dailyEngagement(windowDays)` | V2 | `activity_events`, `fsrs_review_logs` |
| View review history by InfoBit | `reviewHistory` | V1.1+ | `fsrs_review_logs` |
| Recompute schedule from history | `recalculateSchedules` | V1 | `fsrs_review_logs`, `fsrs_card_states` |

## F. Scheduler Policy Control

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Preview effective policy for InfoBit | `schedulerPolicyPreview` | V1 | `scheduler_policies`, `algorithms`, category/user defaults |
| Set/update user default policy | `upsertSchedulerPolicy(scope=USER_DEFAULT)` | V1 | `scheduler_policies` |
| Set/update category policy | `upsertSchedulerPolicy(scope=CATEGORY)` | V1 | `scheduler_policies` |
| Set/update InfoBit policy | `upsertSchedulerPolicy(scope=INFOBIT)` | V1 | `scheduler_policies` |
| Remove policy override | `removeSchedulerPolicy` | V1 | `scheduler_policies` |
| Apply new policy to future only | `upsertSchedulerPolicy(applyMode=FUTURE_ONLY)` | V1 | `scheduler_policies` |
| Apply new policy + recompute existing | `upsertSchedulerPolicy(applyMode=RECALCULATE_EXISTING)` | V1 | `scheduler_policies`, replay job |

### F.1 Generation Policy + Learning Defaults (V2)

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Preview effective generation policy for one InfoBit | `generationPolicyPreview` | V2 | `generation_policies`, inheritance resolver |
| Load category-level generation policy | `generationPolicyByCategory` | V2 | `generation_policies` |
| Save generation policy override | `upsertGenerationPolicy` | V2 | `generation_policies` |
| Remove generation policy override | `removeGenerationPolicy` | V2 | `generation_policies` |
| Load generation scale labels for settings UX | `generationPolicyScaleMetadata` | V2 | static resolver metadata |
| Load user learning defaults for New flow | `myLearningPreferences` | V2 | `user_learning_preferences` |
| Update user learning defaults for New flow | `updateLearningPreferences` | V2 | `user_learning_preferences` |

## G. Flags and Quality Controls

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Flag InfoBit | `createFlag(entityType=INFOBIT)` | V1 | `flags`, `activity_events` |
| Flag card | `createFlag(entityType=CARD)` | V1 | `flags`, `cards.flagged_at` |
| Flag tag | `createFlag(entityType=TAG)` | V1 | `flags` |
| Resolve flag | `resolveFlag` | V1 | `flags` |
| List flags by state/type | `flags` | V1 | `flags` |

## H. Dashboard and Organization

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Open main dashboard | `dashboardInfoBits` | V1 | composed query |
| See flagged InfoBits first | `dashboardInfoBits.flaggedInfoBits` | V1 | `flags`, `info_bits` |
| See flagged cards summary | `dashboardInfoBits.flaggedCards` | V1 | `flags`, `cards`, `info_bits` |
| See sections by tag | `dashboardInfoBits.sectionsByTag` | V1 | `tags`, `info_bit_tags`, `info_bits` |

## H.1 Runtime Diagnostics and Quality Validation (V2)

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Read backend health and feature flag state | `health` (with `featureFlags`) | V2 | resolver runtime flags |
| Validate persisted NoteSpec structure/checks | `validateNoteSpec(infoBitId)` | V2 | `info_bits.note_spec_json`, review/card content checks |

## I. Activity and Audit

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| View own action timeline | `activityEvents` | V1.1+ | `activity_events` |
| Inspect one InfoBit timeline | `infoBitActivity` | V1.1+ | `activity_events` |

## J. Notifications and Reminders

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Configure reminder preference | `upsertReminderSettings` | V1.1+ | `user_settings` |
| Receive daily summary count | backend job + `notificationDigest` | V1.1+ | `fsrs_card_states`, notification logs |
| Open reminder history | `notificationHistory` | V1.1+ | notification logs |

## K. Import/Export/Sharing

| User Action | GraphQL Operation | Phase | Primary Data |
|---|---|---|---|
| Export user data | `exportData` | V1.2+ | SQL + Mongo snapshot |
| Import from external source | `importData` | V1.2+ | SQL + Mongo ingest |
| Share InfoBit with another user | `shareInfoBit` | Future | sharing model |

## Coverage Notes

- Current data model supports all `V1` rows above.
- `V1.1+` rows are included so schema evolution remains predictable.
- FSRS is the only runtime algorithm in v1, but table design keeps future algorithm additions possible.
- V2 rollout rows capture additive queue/preview/engagement APIs and doctrine-category migration requirements described in `BACKEND_CHANGE_SPEC_V2.md`.
- V2 generation doctrine follows retrieval-first policy: `true_false` style is intentionally excluded.
