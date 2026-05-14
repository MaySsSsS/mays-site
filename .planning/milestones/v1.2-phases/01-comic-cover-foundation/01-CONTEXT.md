# Phase 1: Comic Cover Foundation - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** Autonomous interactive, no additional user questions needed

<domain>
## Phase Boundary

Build the first viewport of `maysssss.cn` as a title-led American comic cover.
The cover must make `MAYS UNIVERSE` the dominant visual subject and should feel
more like a real comic cover than a conventional website hero.
</domain>

<decisions>
## Locked Decisions

- The first viewport headline is exactly `MAYS UNIVERSE`.
- The cover should stay almost pure: no issue label, subtitle, bio, feature copy, or explicit scroll text.
- The strongest visual levers are huge title pressure, dynamic composition, thick black ink, CMYK-like color, and halftone print texture.
- A subtle non-text motion cue may imply that the page continues below.
</decisions>

<code_context>
## Existing Code Insights

- Root page entry: `app/page.tsx`.
- Portal styles: `styles/portal.module.css`.
- `app/not-found.tsx` reuses portal classes, so legacy class names should remain usable.
- Existing global font tokens are defined in `app/globals.css`.
</code_context>

<specifics>
## Specific Ideas

- Use CSS-only comic textures and speed-line composition to avoid new assets or dependencies.
- Keep the page as a server component; no client state is required for the cover.
- Use `prefers-reduced-motion` to keep the motion cue respectful.
</specifics>

<deferred>
## Deferred Ideas

None.
</deferred>
