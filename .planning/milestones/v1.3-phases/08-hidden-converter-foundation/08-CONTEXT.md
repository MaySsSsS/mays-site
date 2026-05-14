# Phase 8: Hidden Converter Foundation - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 establishes the hidden `/tools/word-to-markdown` route, page shell,
local-only privacy messaging, dependency foundation, file selection/drop flow,
and file validation. It does not implement `.docx` conversion, Markdown output,
image extraction, zip export, or public `/tools` promotion.

</domain>

<decisions>
## Implementation Decisions

### Route And Visibility
- Use `/tools/word-to-markdown` as the hidden route.
- Do not add the tool to `app/tools/page.tsx` or the homepage.
- Keep navigation back to `/tools`, but make the page itself visibly marked as
  hidden/internal validation.

### File Intake
- Support one file at a time in Phase 8.
- Accept `.docx` through click-to-select and drag/drop.
- Reject `.doc`, non-Word files, and files over a conservative size limit.
- Show validation failures in the UI, not console-only.

### Privacy Boundary
- State clearly that files stay in the browser.
- Do not add Worker calls, server actions, uploads, R2 writes, localStorage file
  persistence, or history.
- Add dependencies needed for later conversion, but do not wire conversion into
  this phase.

### UI Direction
- Use a quieter document-tool style than the holographic hub.
- Keep copy Chinese-first because this is a personal utility validation page.
- Preserve existing CSS Modules and App Router patterns.

### the agent's Discretion
- Exact typography scale, page copy, and validation size limit can be chosen by
  the agent as long as the requirements remain testable.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/tools/qr/page.tsx` and `components/tools/QrStudio.tsx` show the current
  tool route + client component pattern.
- `styles/tools/qr.module.css` and `styles/tools/style-prompt.module.css` show
  route-local CSS Module patterns.

### Established Patterns
- Tool pages use a server route wrapper that exports `metadata` and renders a
  client component.
- Client tool state is local React state; no global store is needed for isolated
  tools.
- Downloads and generated blobs are created in the browser.

### Integration Points
- New files should live under `app/tools/word-to-markdown/`,
  `components/tools/`, and `styles/tools/`.
- `app/tools/page.tsx` must remain unchanged for this phase so the tool stays
  hidden.

</code_context>

<specifics>
## Specific Ideas

- The user chose hidden route behavior for the first milestone slice.
- The earlier idea of storing conversion history in R2 is explicitly deferred.
- The old WeChat `word2md` directory may be referenced later if it becomes
  readable, but Phase 8 can proceed from the agreed product scope.

</specifics>

<deferred>
## Deferred Ideas

- Actual `.docx` to Markdown conversion.
- Markdown result view, copy, and `.md` download.
- Image extraction and zip export.
- Public `/tools` card promotion.
- R2-backed conversion history.

</deferred>
