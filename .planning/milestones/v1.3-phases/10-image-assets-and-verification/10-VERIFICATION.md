---
status: passed
phase: 10
---

# Phase 10 Verification

**Date:** 2026-05-10
**Result:** Passed

## Requirements Verified

- W2M-09: Embedded `.docx` images are extracted during conversion.
- W2M-10: User can download a ZIP containing Markdown and an `assets/`
  directory.
- W2M-11: Generated Markdown uses stable relative image paths such as
  `./assets/image-1.png`.

## Commands

- `pnpm typecheck` -- passed
- `pnpm lint` -- passed
- `pnpm build` -- passed
- `curl -I http://localhost:3001/tools/word-to-markdown` -- returned `HTTP 200`
  after restarting the dev server
- Local Mammoth image smoke test -- produced
  `![tiny pixel](./assets/image-1.png)` and extracted one PNG asset
- Local JSZip smoke test -- produced `document.md`, `assets/`, and
  `assets/image-1.png`
- Static link scan -- confirmed `/tools/word-to-markdown` is not linked from
  `/tools` or the homepage
- Safety scan -- confirmed no new upload, Worker, R2, localStorage, IndexedDB,
  or document network path was introduced

## Build Notes

- The production build generated `/tools/word-to-markdown`.
- Static generation still emitted the pre-existing external timeout warnings for
  `mays-game-api.mays.workers.dev`, but the build completed successfully.

## Browser Verification Notes

- Codex in-app browser automation timed out during Phase 9 and was not reliable
  enough for final click-through UAT.
- Dev server route verification initially returned `500` after `pnpm build`
  ran while `pnpm dev` was still active; restarting the dev server restored
  `HTTP 200`, consistent with Next dev/build cache interference rather than an
  application runtime failure.

## Promotion Decision

The converter remains hidden. Public `/tools` promotion is deferred until the
user tests representative real documents and accepts the conversion quality.
