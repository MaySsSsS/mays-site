# Phase 2: Portal Panel Directory - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** Autonomous interactive, no additional user questions needed

<domain>
## Phase Boundary

Below the cover, create a same-page comic directory where panels act as portals
to existing and future sections.
</domain>

<decisions>
## Locked Decisions

- The page scrolls directly from cover into the panel directory.
- Game and Photos are clear entrances.
- Future sections stay unnamed.
- Coming Soon panels should feel sealed, provide light feedback, and never navigate.
- Panel copy should be mostly English, with Chinese used only where it helps the `未完待续` theme.
</decisions>

<code_context>
## Existing Code Insights

- Existing routes are `/game` and `/photos`.
- `Link` from Next.js is already used by the current portal.
- Non-navigating future panels can be rendered as buttons with CSS hover/active feedback.
</code_context>

<specifics>
## Specific Ideas

- Use two real entrance panels and two sealed panels for a balanced 2x2 directory.
- Give Game and Photos comic-chapter labels while preserving explicit `GAME` and `PHOTOS` labels.
- Use a diagonal tape treatment to make sealed panels feel intentionally locked.
</specifics>

<deferred>
## Deferred Ideas

- Future section names and routes.
</deferred>
