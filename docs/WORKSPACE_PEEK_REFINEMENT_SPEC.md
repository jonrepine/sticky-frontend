# Workspace Peek Refinement Spec

## Why This Spec Exists

The workspace stage has improved, but two problems remain:

1. On mobile, it is not obvious enough that there are cards to the left and right.
2. On desktop, the blurred side cards stop abruptly instead of extending naturally outward.

This document defines the exact implementation required to fix those two issues without making the side cards too centered, too readable, or too blurred.

## Desired Perception

The user should immediately understand:

- there is one active card in the middle
- there is another card on the left
- there is another card on the right
- those neighboring cards are available now

But the user should not:

- read the exact side-card content
- mistake a side card for a second primary surface
- feel like the stage is crowded

## Current Failure Modes

### Mobile failure

The current compact geometry is too conservative:

- active card width is nearly full-width
- the mobile reveal ratio is too small
- the preview depth treatment recesses the neighbors too much

Net effect:

- the neighboring cards are present technically
- they are not discoverable perceptually

### Desktop failure

The current preview lane is clipped to the reveal width itself.

That means:

- the visible sliver is working as intended
- but the blurred card stops at the same mask boundary
- so the eye sees a chopped-off blur, not a card extending beyond the frame

This makes the side surfaces feel mechanically cropped instead of spatially continuous.

## Design Principle

The side cards need two separate behaviors:

1. an **edge peek** near the active card
2. a **wing continuation** that carries outward toward the screen edge

These are different visual jobs and should not be implemented by the same mask.

The intended feeling is:

- the same workspace continuing beyond the center frame
- one active card in focus
- two neighboring cards clearly present but perceptually secondary

## Mobile Commands

Implement all of the following on mobile:

- both side cards must visibly peek at rest
- the peeks must survive regardless of card content
- the side peeks must remain non-readable
- the user must detect both neighboring cards before swiping

## Geometry Rules

### Active card width

Replace the current compact active width with:

- target active width: `calc(100% - 40px)` to `calc(100% - 48px)`

This reserves real side gutters instead of hoping reveal math creates them.

### Minimum visible peek

Implement both percentage reveal and pixel clamping:

- minimum visible peek per side: `18px`
- preferred visible peek per side: `20px` to `24px`

If percentage math yields less than that, clamp upward.

### Preview scale

Set mobile preview depth to:

- scale: `0.84` to `0.88`
- blur: `4px` to `5px`
- opacity: `0.72` to `0.8`

This is intentionally more present than the current treatment.

## Mobile Discoverability Commands

Implement all three of the following behaviors together:

### A. Edge-light cue

Add a subtle inner highlight where the side cards approach the active card edge.
Command:

- render a narrow highlight band on the inner edge of each preview
- keep the band low-contrast
- use it only to improve edge detection
- do not turn it into a glowing accent

### B. Idle drift

On initial load only, nudge the side cards inward by `4px` to `6px` and settle them back.
Command:

- run once on first workspace mount
- total duration: `420ms` to `560ms`
- use ease-out only
- keep movement subtle enough that the interface still feels calm

### C. Drag reveal amplification

As the user starts a horizontal drag:

- neighboring cards should become slightly more visible
- blur should reduce slightly
- active card should shift enough to confirm the lateral model

Command:

- increase visible peek during drag by `6px` to `12px`
- reduce blur by `1px` to `2px` during drag
- increase preview opacity slightly during drag
- shift the active card enough to confirm direction without exposing full side-card content

Do not add arrows, helper copy, or tutorial text.

## Desktop Commands

Implement the desktop previews so the neighboring workspace feels continuous beyond the center frame:

- the visible card edge near the center should remain controlled
- the blurred side surface should continue all the way toward the screen edge
- the outer continuation should feel atmospheric, not like a full second card

Split desktop preview rendering into two layers:

### Layer 1: Edge Peek

This is the card edge nearest the active surface.

Rules:

- masked to the desired reveal width
- crisp enough to establish the card boundary
- retains recognisable card silhouette

### Layer 2: Wing Fill

This is a blurred continuation extending outward toward the viewport edge.

Commands:

- stretches from the reveal boundary to the stage edge or viewport edge
- uses stronger blur and lower contrast than the edge peek
- does not need to preserve exact readable UI detail
- use a duplicated card render with stronger masking and long fade
- keep the wing visually tied to the same card rather than inventing a separate backdrop treatment

## Lane Geometry

Change desktop preview lanes as follows:

- left lane spans from viewport left edge to the active card’s left reveal boundary
- right lane spans from the active card’s right reveal boundary to viewport right edge

Within that lane:

- the inner portion shows the card edge
- the outer portion carries the wing fill

## Masking Rules

Near the active card:

- use a tighter mask
- keep the edge boundary visually clear

Toward the outer screen edge:

- use a long directional gradient fade
- do not hard-crop the blur continuation
- taper the wing outward until it disappears into the canvas

## Recommended Desktop Values

### Edge Peek

- visible edge width: `84px` to `120px`
- scale: `0.95` to `0.97`
- blur: `3px` to `4px`
- opacity: `0.78` to `0.86`

### Wing Fill

- blur: `10px` to `18px`
- opacity: `0.28` to `0.42`
- mask fade: long, soft, directional

The wing fill is not another card. It is the atmospheric continuation of that neighboring card.

## Architectural Changes

The current `WorkspacePreviewLane` is trying to do everything:

- lane
- mask
- card
- blur continuation

That is why the desktop blur ends where the lane ends.

Refactor preview rendering into:

- `WorkspacePreviewLane`
- `WorkspacePreviewEdge`
- `WorkspacePreviewWing`

### `WorkspacePreviewLane`

Owns:

- absolute positioning
- side geometry
- shared height

### `WorkspacePreviewEdge`

Owns:

- visible card edge
- limited reveal width
- click target near the center edge

### `WorkspacePreviewWing`

Owns:

- far-side extension
- long blur fade
- atmospheric continuation

## Constraints

### Do not do this

- do not make the side cards fully visible
- do not center the side cards more just to make them noticeable
- do not remove blur entirely
- do not replace them with fake placeholder blocks
- do not make the mobile peeks so small that only designers notice them

### Do this instead

- reserve actual side space on mobile
- enforce a minimum visible peek
- separate the near-edge reveal from the outer blur continuation
- make the desktop blur extend outward, not stop at the reveal mask

## Acceptance Criteria

## Mobile

- user can immediately tell there are cards on both sides
- both side peeks are visible at rest
- side cards are not readable
- active card remains dominant

## Desktop

- neighboring cards feel spatially to the left and right
- the blur continues outward instead of stopping abruptly
- the visible edge near the active card remains crisp enough to establish adjacency
- the outer continuation does not feel chopped off

## Shared

- no regression in swipe behavior
- no regression in tap-to-open side cards
- no duplicate primary navigation outside the card once nav work is completed

## Implementation Order

1. Tighten mobile active width and add minimum peek clamping.
2. Increase mobile preview presence using the specified scale, blur, and opacity values.
3. Add edge-light cue.
4. Add one-time idle drift.
5. Add drag reveal amplification.
6. Split desktop preview rendering into edge reveal and wing fill.
7. Extend desktop preview lanes to the viewport edges.
8. Tune desktop fade and blur until the side surfaces feel endless rather than cropped.
9. Revisit motion polish only after geometry and reveal behavior are correct.

## Decision

The right solution is not "more reveal" alone.

The right solution is:

- more guaranteed peek on mobile
- less over-recessed mobile previews
- a two-layer desktop preview model with edge reveal plus wing continuation

That is how the workspace will communicate adjacency clearly while still protecting focus.
