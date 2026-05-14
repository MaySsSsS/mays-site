# Research: Word to Markdown Pitfalls

**Milestone:** v1.3 Word to Markdown
**Date:** 2026-05-10

## Common Pitfalls

- Promising layout-perfect conversion. Word documents contain layout details
  that Markdown cannot represent cleanly.
- Treating `.doc` as equivalent to `.docx`. Legacy `.doc` is a different binary
  format and should stay out of scope.
- Forgetting image path rewriting. Markdown must reference extracted images
  using predictable relative paths.
- Rendering converted HTML without sanitization.
- Allowing very large files without size limits or clear failure states.
- Adding a `/tools` public card before conversion quality has been checked with
  real documents.

## Prevention Strategy

- Requirements should explicitly say `.docx` only.
- UI should describe output as semantic Markdown, not exact Word reproduction.
- Add a conservative file-size limit in requirements.
- Keep hidden route until UAT passes with representative documents.
- If HTML preview is included, sanitize before `dangerouslySetInnerHTML`; if
  sanitization is not added, show Markdown preview only.

## Phase Coverage

- Architecture and dependency phase should decide the exact conversion helper
  API.
- Core conversion phase should verify text, headings, lists, links, tables, and
  images.
- Polish/verification phase should cover file-size errors, invalid file types,
  zip contents, and copy/download actions.
