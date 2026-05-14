# Milestones

## v1.3 Word to Markdown (Shipped: 2026-05-10)

**Phases completed:** 3 phases, 6 plans, 0 tasks

**Key accomplishments:**

- Added hidden `/tools/word-to-markdown` route with local-only privacy
  guardrails and no public `/tools` or homepage promotion.

- Added browser-local `.docx` to Markdown conversion with visible status,
  warnings, generated Markdown inspection, clipboard copy, and `.md` download.

- Added embedded image extraction with stable Markdown references such as
  `./assets/image-1.png`.

- Added ZIP export containing `document.md` and an `assets/` image directory.

- Completed milestone audit and verification while keeping uploads, R2,
  Worker conversion, auth, and history out of scope.

---

## v1.2 Style Prompt Index (Shipped: 2026-05-10)

**Phases completed:** 4 phases, 8 plans, 0 tasks

**Key accomplishments:**

- Added `/tools` as the Signal Lab tools hub and promoted `Tools` to a live
  homepage entrance.

- Shipped `QR Studio` at `/tools/qr` with local QR generation, customization,
  reset, PNG export, and SVG export.

- Verified the tools branch for responsive behavior, keyboard flow,
  reduced-motion-safe interactions, type safety, lint, and production build.

- Added `/tools/style-prompt` as a local UI style prompt index with searchable
  categories, square preview images, modal detail viewing, and bilingual prompt
  copy actions.

- Audited the UI-Prompt-derived data and preview assets, filtered broken
  previews, documented fallback behavior, completed UAT, and completed security
  review.

---
