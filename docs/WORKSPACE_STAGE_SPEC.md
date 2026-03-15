# Workspace Stage Spec

## Purpose

Define the correct interaction and layout model for the `New` / `Learn` / `Review` workspace so it feels like one coherent product object:

- one primary card in the center
- two adjacent cards visibly present on the left and right
- clear spatial relationship between states
- low cognitive load
- no accidental clipping, misalignment, or nested-card confusion

This spec replaces the current "stack of clipped glass cards with transforms" approach.

The visual target is:

- the same workspace continuing beyond the center frame
- one active card in focus
- two neighboring cards visibly present as the same system

## Product Intent

The workspace must communicate:

- "This is one place."
- "You are currently in one mode."
- "The other two modes are immediately next to you."
- "You can move laterally between them without leaving the object."

The side cards are not decorative. They are spatial cues.

They must be:

- visible enough to signal adjacency
- abstract enough that they do not compete with the active card
- aligned enough that the composition feels deliberate, not improvised

## Non-Goals

This spec does not try to:

- redesign `My Cards`
- redesign the header chrome
- redesign the drawer
- define final animation polish
- finalize typography or brand palette

This spec is specifically about the workspace stage architecture and composition.

## Current Problems

### 1. Too many clipping layers

The current implementation clips at multiple levels:

- app canvas
- app shell main
- workspace stage
- workspace surface
- preview wrappers

Result:

- side cards get cut off unpredictably
- edge visibility depends on parent overflow behavior instead of intentional masking
- the layout feels broken instead of designed

### 2. Side-card geometry is percentage-driven, not object-driven

The preview placement is currently based on broad translate percentages rather than a defined stage geometry.

Result:

- on desktop the right card can read as "behind" instead of "to the right"
- on mobile both cards can collapse into the back plane
- alignment drifts as widths and paddings change

### 3. Visual hierarchy is too nested

Right now there is:

- a workspace card
- inner feature cards
- inset cards
- a floating dock
- header controls outside the card

Result:

- the user does not feel one clear primary object
- the screen reads as "containers inside containers"
- the side cards inherit too much internal detail and become noisy

### 4. Side cards reveal too much exact content

The side cards are supposed to show presence, not invite reading.

Result:

- they compete with the active card
- mobile becomes crowded
- the user sees too much layout detail before intentionally moving there

## North Star

The gold-standard mental model is:

- one stage
- one active card
- two neighboring cards peeking from the edges

The active card owns attention.

The neighboring cards should feel like:

- same family
- same object class
- same scale language
- slightly recessed
- partially hidden by the stage edges

Not:

- tiny thumbnails
- separate mini-pages
- fully readable duplicate interfaces
- abstract fake placeholders

## UX Requirements

### Active Card

The active card must:

- be fully readable
- be visually centered
- feel stable and primary
- contain all study-route interaction except header chrome
- include the section nav inside the card

### Side Cards

The side cards must:

- sit clearly to the left and right of the active card
- remain vertically aligned with the active card
- be partially visible, not fully visible
- be slightly smaller than the active card
- be slightly blurred and lower-contrast
- remain recognizably "real cards"
- not expose enough content to compete with the active card

### Card Presence Rule

The side cards should show:

- card edge
- some internal rhythm
- a hint of title/content blocks
- bottom nav silhouette if present

The side cards should not show:

- full readable paragraphs
- clearly legible controls
- enough exposed width to feel independently usable

### Discoverability Rule

The implementation must make the following obvious within 2 seconds:

- there are modes on both sides
- they can swipe on mobile
- they can tap/click the visible side card
- they can also use the nav inside the card

## Layout Commands

## Stage Architecture

The workspace should use four layers:

1. `WorkspaceStage`
   - full-width positioning context
   - `overflow: visible`
   - owns gesture handling

2. `PreviewLaneLeft`
   - absolute layer
   - aligned to active-card centerline
   - masks only the preview card reveal

3. `ActiveLane`
   - centered lane
   - fixed workspace width token
   - highest z-index

4. `PreviewLaneRight`
   - mirrors left lane

Implement these constraints:

- the stage itself must not clip horizontally
- the preview lanes may mask their own visible area
- the active lane must define the geometry

## Width Commands

Define one canonical workspace width:

- desktop active width: `min(52rem, 100%)`
- mobile active width: `calc(100% - 40px)` to `calc(100% - 48px)`

Then derive side cards from that:

- desktop preview width: `92%` of active width
- mobile preview width: `80%` of active width
- mobile minimum visible peek per side: `18px`
- mobile preferred visible peek per side: `20px` to `24px`

Do not independently choose:

- active width in one place
- preview width in another
- shell width somewhere else
- translate percentages in a third place

All preview offsets must derive from active width and desired visible peek.

## Peek Visibility Commands

These are the intended visible slivers of the side cards.

### Desktop

- visible portion per side: roughly `12%` to `18%` of the preview card width
- enough to clearly read as a neighboring workspace card
- not enough to read detailed content

### Mobile

- visible portion per side: roughly `8%` to `12%` of the preview card width
- clamp the visible portion upward to the mobile minimum peek target
- keep both neighboring cards noticeable at rest
- only a small slice should be visible

If the user can comfortably read the side card body copy, too much is showing.

If the user cannot tell there are cards on both sides, too little is showing.

## Depth Commands

The previews should differ from the active card by a restrained depth treatment.

### Required differences

- scale down slightly
- lower opacity slightly
- blur slightly
- sit behind active card with lower z-index

### Recommended targets

Desktop:

- scale: `0.94` to `0.96`
- blur: `4px` to `6px`
- opacity: `0.7` to `0.82`

Mobile:

- scale: `0.84` to `0.88`
- blur: `4px` to `5px`
- opacity: `0.72` to `0.8`

### Explicit constraint

Do not overdo blur or displacement.

The user request is clear:

- not too off-centre
- not too blurred
- side cards should be visible as neighboring destinations
- exact content should not be readable

That means depth must be subtle, not theatrical.

## Card Structure

For study routes, the primary object is:

- outer workspace card

Inside it:

- section content region
- internal section nav region

The workspace card is the only major container that should visually dominate.

### Container policy

Allowed:

- one outer workspace card
- light inset surfaces inside for functional groupings

Avoid:

- "hero card inside workspace card"
- repeating heavy glass treatments on every nested section
- multiple equally loud rounded containers stacked vertically



## Motion Rules

Motion should reinforce spatial continuity, not draw attention to itself.

### Required

- one-time idle drift on first workspace mount: `4px` to `6px` inward, then settle
- drag reveal amplification on horizontal drag
- subtle inner edge-light cue on both previews
- short horizontal slide between active cards
- small scale/opacity change on active transition
- subtle preview settling

### Avoid

- bounce
- large overshoot
- exaggerated perspective
- skew
- too many simultaneous motion layers
- helper arrows
- instructional copy

### Timing targets

- active-card enter: `180ms` to `240ms`
- active-card exit: `140ms` to `180ms`
- idle drift total duration: `420ms` to `560ms`
- ease: strong ease-out for enter, quicker ease-in for exit

### Drag-response targets

- increase visible peek during drag by `6px` to `12px`
- reduce preview blur during drag by `1px` to `2px`
- increase preview opacity slightly during drag
- shift the active card enough to confirm direction without exposing full side-card content

## Desktop Continuation Commands

Implement desktop side previews as two separate layers:

- `WorkspacePreviewEdge`
- `WorkspacePreviewWing`

`WorkspacePreviewEdge` commands:

- place the visible card edge nearest the active card
- keep the edge boundary crisp enough to communicate adjacency
- keep reveal width within `84px` to `120px`

`WorkspacePreviewWing` commands:

- extend from the edge reveal boundary to the viewport edge
- use stronger blur than the edge reveal
- use lower opacity than the edge reveal
- fade outward with a long directional gradient
- do not end with a hard crop

## Implementation Plan

### Phase 1: Layout Foundation

Create explicit workspace stage components:

- `WorkspaceStage`
- `WorkspaceActiveLane`
- `WorkspacePreviewLane`

Tasks:

- remove horizontal clipping from the stage path
- keep clipping only where a preview viewport intentionally masks its own card
- centralize width tokens and preview geometry
- clamp mobile peek to the required minimum

### Phase 2: Surface Simplification

Tasks:

- confirm outer workspace card is the main object
- reduce nested heavy-glass surfaces in `NewPage` and `StudySession`
- keep inset sections quieter than the outer workspace shell

### Phase 3: Internal Navigation

Tasks:

- keep workspace nav inside the card for study routes
- remove external dock/nav duplication on those routes
- ensure nav alignment is consistent across `New`, `Learn`, and `Review`

### Phase 4: Preview Tuning

Tasks:

- tune exact visible edge width
- tune preview scale
- tune blur and opacity
- add edge-light cue
- add one-time idle drift
- add drag reveal amplification
- verify desktop and mobile separately

### Phase 5: Alignment Pass

Tasks:

- vertically align preview and active cards
- align nav baseline
- align content padding across sections
- eliminate any off-center optical imbalance

## Acceptance Criteria

The implementation is successful only if all of the following are true:

### Spatial Clarity

- on desktop, the left preview reads left and the right preview reads right
- on mobile, both neighboring cards are visible as edge peeks
- neither side card appears centered behind the active card

### Visibility Control

- side cards are only partially visible
- side cards are not fully readable
- side cards remain clearly recognizable as destinations

### Containment

- all study-route interaction is inside the workspace card
- only logo, theme toggle, and burger menu remain outside
- no duplicate external nav appears on study routes

### Hierarchy

- the active card is the strongest element on screen
- side cards do not compete with it
- nested containers feel restrained, not repetitive

### Responsiveness

- mobile still shows both side destinations
- desktop composition feels centered and balanced
- no accidental cropping occurs because of parent clipping

## Suggested Technical Changes

### Files likely involved

- `src/features/workspace/WorkspacePage.tsx`
- `src/lib/ui/glass.ts`
- `src/components/AppShell.tsx`
- `src/components/FloatingDock.tsx`
- `src/features/new/NewPage.tsx`
- `src/features/review/StudySession.tsx`

### Specific changes

1. Replace transform-only preview layout with explicit left/right preview lanes.
2. Remove `overflowX: "clip"` from stage-level containers where it interferes with preview visibility.
3. Keep `overflow: hidden` only on actual card surfaces and preview masks.
4. Move all study-route nav responsibility inside the workspace card.
5. Reduce nested hero-card styling inside `New` and `Review`.
6. Tune preview exposure using fixed reveal targets rather than ad hoc percentages.

## Validation Commands

Verify all of the following before approval:

- both adjacent cards are visible on mobile without becoming readable
- the right card clearly feels right, not behind
- the active card is optically centered
- the screen reads as one product object
- the external chrome is limited to logo, theme toggle, and burger menu
- clipping complexity has been reduced instead of relocated

## Decision

The right solution is not more transform tweaking inside the current clipped structure.

The right solution is:

- a true stage
- a true active lane
- true left/right preview lanes
- one dominant workspace card
- restrained side-card peeks

That is the implementation direction this project should follow.
