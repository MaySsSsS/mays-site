# Phase 8 UI Spec: Hidden Converter Foundation

**Date:** 2026-05-10
**Status:** Approved for implementation

## Role

The page is an internal validation tool for a future public converter. It should
feel calmer and more utility-focused than the holographic Signal Lab hub.

## Layout

- Topline contains a back link to `/tools` and a `Hidden Route` badge.
- Hero explains that the page is local-only and not yet publicly listed.
- Main workspace has two panels:
  - File intake panel with reset, dropzone, and validation result.
  - Privacy boundary panel listing what the page does not do.

## Content

- Use Chinese-first interface copy.
- Explicitly say conversion is not implemented until the next phase.
- Explicitly say files are not uploaded, stored, sent to R2, or sent to Worker
  APIs.

## Interaction

- File input supports click-to-select.
- Dropzone supports drag enter, drag over, drag leave, and drop.
- Valid `.docx` shows filename and size.
- Invalid files show a clear rejection message.
- Reset clears the selected file and drag state.

## Accessibility

- File input must be keyboard reachable through the label/dropzone.
- Error state uses `role="alert"`.
- Valid file state uses `role="status"`.
- Reduced motion removes hover/drop transforms.

## Out of Scope

- Markdown preview.
- Real conversion progress.
- Zip/download actions.
- Public tool card.
