# Phase 5: QR Studio Core Functionality - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning
**Mode:** Autonomous continuation from approved milestone direction

<domain>
## Phase Boundary

Turn `QR Studio` into the first real Signal Lab utility with editable QR
generation and export.
</domain>

<decisions>
## Locked Decisions

- `QR Studio` is public-safe and frontend-only.
- The tool must support plain text or URLs, not just links.
- Export targets are `PNG` and `SVG`.
- No auth, uploads, history, or storage are part of this tool.
</decisions>

<code_context>
## Existing Code Insights

- `/tools` already exists as the new hub route and links to `/tools/qr`.
- The app has no QR generation dependency yet, so this phase can add a focused
  library without touching workers or stores.
- A client component is the natural fit for live controls and preview output.
</code_context>

<specifics>
## Specific Ideas

- Use a live preview surface with immediate feedback as settings change.
- Keep reset and download actions prominent so the tool feels practical, not
  decorative.
- Use the same holographic visual language as the hub, but tighten the layout
  around utility.
</specifics>

<deferred>
## Deferred Ideas

- QR presets, saved history, and branded templates.
- Batch generation or file import.
</deferred>
