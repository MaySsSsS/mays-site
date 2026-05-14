# Research Summary: Word to Markdown

**Milestone:** v1.3 Word to Markdown
**Date:** 2026-05-10

## Stack Additions

- `mammoth` for browser-side `.docx` parsing and image extraction.
- `turndown` if Markdown output needs more control than Mammoth's direct
  Markdown conversion.
- `jszip` for packaging Markdown and images.
- `dompurify` only if the implementation adds HTML preview.

## Feature Table Stakes

- Hidden route under `/tools`.
- Local `.docx` selection/drop.
- Browser-only conversion.
- Markdown display and copy.
- `.md` download.
- Zip download containing Markdown plus extracted image assets.
- Conversion warnings and clear unsupported-file errors.

## Watch Outs

- Keep `.doc` out of scope.
- Do not promise layout-perfect conversion.
- Do not upload or persist file contents.
- Add file-size limits.
- Sanitize generated HTML if previewing HTML.

## Recommendation

Proceed without backend services. Define v1.3 requirements around a hidden,
local-only `.docx` converter with image zip export, then roadmap the work into:
foundation/dependencies, core conversion, and polish/verification.
