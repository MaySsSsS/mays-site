# Phase 10: Image Assets And Verification - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 completes the hidden Word to Markdown milestone by extracting embedded
`.docx` images, rewriting Markdown image references to stable relative asset
paths, adding zip export, and running final verification. It does not expose the
tool publicly from `/tools`, add cloud history, upload documents, or introduce
server-side conversion.

</domain>

<decisions>
## Implementation Decisions

### Image Extraction
- Use Mammoth's `convertImage` hook during the existing browser-local conversion.
- Store extracted image bytes in React state only.
- Name assets deterministically in encounter order: `image-1.ext`,
  `image-2.ext`, and so on.
- Use Markdown references such as `./assets/image-1.png`.

### Zip Export
- Use existing `jszip` dependency in the browser.
- Generate a zip containing `document.md` at the root and image files under
  `assets/`.
- Keep `.md` download as a fast single-file action.
- Show asset count and stable paths after conversion.

### Verification And Promotion
- Run typecheck, lint, build, route availability, and local conversion smoke
  tests.
- Verify no upload, Worker, R2, history, localStorage, or IndexedDB path is
  added.
- Keep the route hidden after this milestone; public promotion stays a future
  decision after hands-on UAT with real documents.

### the agent's Discretion
- Exact button labels, asset summary wording, and zip filename can be chosen by
  the agent as long as the requirements remain testable and the page stays
  Chinese-first.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/tools/WordToMarkdown.tsx` already reads valid `.docx` files as
  `ArrayBuffer`, converts them with Mammoth, shows Markdown, copies Markdown,
  and downloads `.md`.
- `styles/tools/word-to-markdown.module.css` already has result panel, button,
  status, warning, and responsive styles.
- `jszip` and `mammoth` are already installed.

### Established Patterns
- Keep isolated tool state local to the client component.
- Use browser-generated Blob URLs for downloads.
- Use CSS Modules only for route-specific UI.

### Integration Points
- Implementation remains in the hidden tool component and CSS module.
- Planning state updates should mark W2M-09, W2M-10, and W2M-11 complete after
  verification.
- `/tools` and root homepage remain unchanged.

</code_context>

<specifics>
## Specific Ideas

- The user originally wanted Word-to-Markdown as a tool candidate, but agreed to
  keep the first implementation hidden until quality is verified.
- R2-backed conversion history remains explicitly out of scope.

</specifics>

<deferred>
## Deferred Ideas

- Public `/tools` card promotion.
- R2-backed conversion history.
- Legacy `.doc`, PDF, OCR, or layout-perfect export.

</deferred>
