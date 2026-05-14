# Phase 7: Style Prompt Index - Context

**Gathered:** 2026-05-06
**Status:** Backfilled from shipped work
**Mode:** Post-implementation planning sync for UAT

<domain>
## Phase Boundary

Add a new `Style Prompt Index` tool inside `/tools` so the site can act as a
local prompt reference library rather than only a QR utility branch.
</domain>

<decisions>
## Locked Decisions

- The page lives at `/tools/style-prompt`, not on the homepage.
- The page should feel quieter than the prompt styles it indexes.
- Data stays local as static assets for this milestone.
- Preview images should be stable and square; broken entries should not ship.
</decisions>

<code_context>
## Existing Code Insights

- The tools hub and QR routes already exist from phases 4-6.
- The new style prompt route relies on local JSON data and generated preview
  assets, not a backend or remote runtime.
- The core user flow is browse -> open modal -> inspect preview -> copy prompt.
</code_context>

<specifics>
## Specific Ideas

- Support category browsing and keyword search.
- Show Chinese-first interface copy while preserving bilingual prompt actions.
- Make fallback prompt behavior explicit when a template lacks its own prompt
  text.
</specifics>

<deferred>
## Deferred Ideas

- Upstream data sync automation.
- Cloud-backed history, favorites, or account features.
</deferred>
