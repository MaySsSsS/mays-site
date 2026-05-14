# Phase 4: Tools Hub And Portal Entrance - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Mode:** Autonomous interactive, user confirmed phase direction

<domain>
## Phase Boundary

Create a real `/tools` branch on the main domain and expose it from the comic
portal without surfacing specific tool names on the homepage.
</domain>

<decisions>
## Locked Decisions

- Homepage gains a `Tools` entrance, not a `QR Studio` entrance.
- The `Tools` branch should lean into worldbuilding, with `Signal Lab`-style
  framing, but still read clearly as a toolbox.
- Specific tool entries live under `/tools`, not on the homepage.
- Future tools should not be named yet if they are not implemented.
- The design language should follow the holographic film prompt: iridescent
  gradients, refracted highlights, metallic glints, and flowing gloss.
</decisions>

<code_context>
## Existing Code Insights

- `app/page.tsx` already models portal entries and sealed panels as local data
  arrays.
- `styles/portal.module.css` contains the current comic grid and panel language.
- No `/tools` route or shared tools component exists yet, so this phase can
  create the initial structure directly.
</code_context>

<specifics>
## Specific Ideas

- Use `SIGNAL LAB` as the world-style title and `TOOLS` as the explicit
  functional label.
- The `/tools` hub should show one live tool card for `QR Studio` plus generic
  future-facing placeholders that imply expansion without naming unfinished
  utilities.
- The homepage `Tools` panel should feel visually distinct from Game and Photos
  through holographic color and sheen, but keep the same comic-panel cadence.
</specifics>

<deferred>
## Deferred Ideas

- Naming and ordering of future tools beyond `QR Studio`.
- Auth, storage, and backend requirements for heavier tools.
</deferred>
