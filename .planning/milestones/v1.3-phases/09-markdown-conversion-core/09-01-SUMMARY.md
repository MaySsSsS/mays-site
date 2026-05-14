# Summary 09-01: Browser Markdown Conversion

## Completed

- Added browser-local `.docx` conversion with Mammoth.
- Read selected files through `file.arrayBuffer()` without upload or Worker
  calls.
- Added converting, converted, and conversion error states.
- Surfaced Mammoth conversion messages as user-facing warnings.
- Reset conversion output when the selected file changes or the tool resets.

## Files Changed

- `components/tools/WordToMarkdown.tsx`
