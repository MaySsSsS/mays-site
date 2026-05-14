# Research: Word to Markdown Stack

**Milestone:** v1.3 Word to Markdown
**Date:** 2026-05-10

## Recommendation

Use a browser-only conversion stack:

- `mammoth`: read `.docx` ArrayBuffer and convert document content to HTML or
  Markdown while exposing embedded images through image converters.
- `turndown`: convert Mammoth HTML output to Markdown when we need more control
  over Markdown formatting than Mammoth's built-in Markdown output.
- `jszip`: package `document.md` and extracted image assets into a zip download.
- Optional `dompurify`: sanitize generated HTML if we add an HTML preview.

## Why This Fits This Project

- The milestone scope is local-only: no upload, no R2, no Worker, no auth.
- Existing project constraints prefer frontend routes, React components, CSS
  Modules, and strict TypeScript.
- The hidden-route scope lets us verify conversion quality before exposing a
  `/tools` card.

## Integration Notes

- Add dependencies only after implementation planning confirms exact APIs.
- Keep conversion in a client component; server components must not parse user
  files.
- Prefer route shape `/tools/word-to-markdown` unless the roadmap chooses a
  shorter slug.
- Downloads can be generated through `Blob`, `URL.createObjectURL`, and a
  temporary anchor click.

## Watch Outs

- `.doc` legacy files are out of scope; browser conversion is practical for
  `.docx`, not old binary Word documents.
- Mammoth focuses on semantic conversion and does not preserve exact visual
  formatting.
- Large files can block the main thread; add file-size limits in requirements.
- HTML preview, if added, must be sanitized before rendering.
