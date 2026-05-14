# Research: Word to Markdown Features

**Milestone:** v1.3 Word to Markdown
**Date:** 2026-05-10

## Table Stakes

- User can select or drag a `.docx` file.
- User can convert the selected file without uploading it.
- User can see conversion status, warnings, and errors.
- User can preview or inspect generated Markdown.
- User can copy generated Markdown.
- User can download the Markdown as `.md`.
- If images exist, user can download a zip containing Markdown plus image
  assets.

## Differentiators For This Site

- Hidden first version: route exists for internal testing but is not exposed in
  `/tools`.
- Clear local-only privacy language near the file picker.
- Conversion warnings surfaced in plain Chinese rather than hidden in console.
- Asset references in Markdown should point to stable relative paths such as
  `./assets/image-1.png`.

## Anti-Features For v1.3

- No `.doc` support.
- No cloud conversion.
- No conversion history.
- No R2 uploads or persistent file storage.
- No OCR, PDF conversion, or layout-perfect reproduction.

## Suggested UX Flow

1. User opens hidden route.
2. User drops or selects one `.docx`.
3. UI validates extension and size.
4. Browser converts content and extracts images.
5. UI shows Markdown output and warning summary.
6. User copies Markdown, downloads `.md`, or downloads zip with assets.
