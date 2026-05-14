# Research: Word to Markdown Architecture

**Milestone:** v1.3 Word to Markdown
**Date:** 2026-05-10

## Proposed Files

- `app/tools/word-to-markdown/page.tsx`: metadata and route wrapper.
- `components/tools/WordToMarkdown.tsx`: client-side converter UI and state.
- `lib/word-to-markdown.ts`: pure conversion helpers if the API is clean enough
  to test separately.
- `styles/tools/word-to-markdown.module.css`: route-specific CSS Module.

## Data Flow

1. Browser receives a local `File` from input or drop.
2. Component validates file type and size.
3. File is read as `ArrayBuffer`.
4. Mammoth converts `.docx` content and image blobs.
5. Markdown is generated and image references are normalized.
6. JSZip packages `document.md` and `assets/*` when image download is needed.
7. Browser downloads generated Blob URLs.

## State Model

- `idle`: no file selected.
- `ready`: valid file selected.
- `converting`: conversion in progress.
- `converted`: Markdown and assets available.
- `error`: validation or conversion failed.

## Security Boundary

- No network request for document content.
- No server action.
- No Worker API.
- No localStorage persistence for uploaded file contents.
- Generated HTML preview should be sanitized or omitted.

## Build Order

1. Add route and hidden page shell.
2. Implement file validation and local-only privacy copy.
3. Implement `.docx` conversion to Markdown.
4. Add image asset extraction and zip export.
5. Add copy/download actions and error/warning display.
6. Verify typecheck, lint, build, and manual browser flow.
