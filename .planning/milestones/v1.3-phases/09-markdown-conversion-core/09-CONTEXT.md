# Phase 9: Markdown Conversion Core - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 turns the hidden Word to Markdown page into a browser-local converter:
valid `.docx` files are read in memory, converted to readable Markdown, shown
on the page, and made available for copy and `.md` download. This phase does
not extract image assets, create zip files, persist history, upload documents,
call Workers, or expose the hidden route from `/tools`.

</domain>

<decisions>
## Implementation Decisions

### Conversion Scope
- Use Mammoth in the client component with a browser `ArrayBuffer` input.
- Generate Markdown directly from Mammoth for this phase to avoid adding another
  dependency before image extraction requires more control.
- Keep all document content and generated Markdown in React state only.
- Surface Mammoth messages as user-facing warnings or errors.

### Output Actions
- Add an explicit "开始转换" action after a valid file is selected.
- Show generated Markdown in a read-only text area so the user can inspect and
  select content manually if needed.
- Provide clipboard copy with visible success/failure feedback.
- Provide `.md` download through a browser Blob URL and a sanitized filename.

### Safety Boundary
- Do not add network calls, server actions, Worker APIs, R2 writes, localStorage,
  IndexedDB, or history.
- Do not render generated HTML, so no sanitizer is needed in Phase 9.
- Continue rejecting `.doc`, non-Word files, and oversized files before any
  conversion attempt.
- Leave embedded image extraction and relative image paths to Phase 10.

### the agent's Discretion
- Exact labels, empty-output messaging, warning wording, and result panel layout
  are at the agent's discretion as long as the requirements remain testable and
  the page stays Chinese-first.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/tools/WordToMarkdown.tsx` already provides the hidden tool shell,
  local file input, drag/drop handling, validation, reset, and privacy copy.
- `styles/tools/word-to-markdown.module.css` already defines the page, panels,
  dropzone, ready state, error state, and reduced-motion handling.
- `mammoth` is already installed and supports browser conversion from
  `{ arrayBuffer }`.

### Established Patterns
- Isolated tools use client component local React state rather than Zustand.
- Route-specific styling uses CSS Modules under `styles/tools/`.
- Browser downloads are generated locally with `Blob`, `URL.createObjectURL`,
  a temporary anchor click, and URL revocation.

### Integration Points
- Implementation should stay within `components/tools/WordToMarkdown.tsx` and
  `styles/tools/word-to-markdown.module.css`.
- `app/tools/word-to-markdown/page.tsx` can remain a thin metadata wrapper.
- `/tools` and the homepage must remain unchanged so the route stays hidden.

</code_context>

<specifics>
## Specific Ideas

- The user wants the tool eventually on the site, but the current milestone is
  hidden and browser-local first.
- The earlier R2/history idea is explicitly deferred until auth, privacy,
  retention, deletion, and cost boundaries are defined.
- Phase 9 should focus on semantic Markdown, not layout-perfect Word
  reproduction.

</specifics>

<deferred>
## Deferred Ideas

- Embedded image extraction.
- Zip export containing Markdown plus `assets/`.
- Stable relative image paths such as `./assets/image-1.png`.
- Public `/tools` promotion.
- R2-backed conversion history.

</deferred>
