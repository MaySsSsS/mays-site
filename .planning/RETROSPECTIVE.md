# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — Style Prompt Index

**Shipped:** 2026-05-10
**Phases:** 4 | **Plans:** 8 | **Sessions:** Not tracked

### What Was Built

- Added `/tools` as the Signal Lab hub and promoted `Tools` to a homepage
  entrance.
- Shipped `QR Studio` with frontend-only QR generation, customization, reset,
  and PNG/SVG export.
- Added `/tools/style-prompt` with local UI-Prompt-derived data, generated
  preview images, searchable categories, modal detail viewing, and bilingual
  prompt copy actions.
- Completed UAT, security review, data audit, phase verification backfill, and
  milestone audit.

### What Worked

- Keeping specific tools inside `/tools` preserved the homepage as a
  branch-level portal instead of turning it into a tool list.
- Static JSON plus generated PNG previews made the style prompt index more
  reliable than runtime demo rendering alone.
- Filtering duplicate or broken scene presets reduced user confusion in the
  modal flow.

### What Was Inefficient

- Planning docs lagged behind implementation for Phase 7, so milestone closeout
  required backfilling verification evidence.
- The first visual direction for the style prompt page competed with the
  indexed styles; the calmer Swiss/minimal tool UI was the better fit.

### Patterns Established

- Public tools should default to local/static behavior unless auth, storage,
  and abuse boundaries are explicitly scoped.
- Prompt and preview catalog pages should keep their own visual chrome quiet so
  the indexed material stays primary.
- Data import scripts should include audit checks for blank previews, duplicate
  prompt signatures, and fallback-only templates.

### Key Lessons

1. For catalog-style tools, stable generated assets are often preferable to
   live embedded demos.
2. Milestone closeout should happen only after implementation files are
   committed; otherwise tags cannot represent shipped code.
3. Verification files should be created per phase as work completes, not
   reconstructed during archive.

### Cost Observations

- Model mix: Not tracked.
- Sessions: Not tracked.
- Notable: UI iteration consumed more attention than initial implementation;
  future visual catalog tools should start with low-presence information
  architecture.

---

## Milestone: v1.3 — Word to Markdown

**Shipped:** 2026-05-10
**Phases:** 3 | **Plans:** 6 | **Sessions:** Not tracked

### What Was Built

- Added hidden `/tools/word-to-markdown` route with local-only privacy
  guardrails.
- Added browser-local `.docx` to Markdown conversion using Mammoth.
- Added Markdown inspection, clipboard copy, `.md` download, status, warnings,
  and conversion failure states.
- Added embedded image extraction with stable `./assets/image-N.ext` Markdown
  references.
- Added ZIP export containing `document.md` and `assets/`.

### What Worked

- Keeping the route hidden let the milestone focus on utility and safety
  without homepage or `/tools` promotion pressure.
- The browser-local stack met the privacy boundary: no upload, Worker, R2,
  auth, or history.
- Smoke tests with generated `.docx` fixtures covered both text conversion and
  image/zip packaging without needing external files.

### What Was Inefficient

- Codex in-app browser automation timed out, so click-through UAT could not be
  recorded in the browser.
- Running `pnpm build` while `pnpm dev` was active temporarily polluted the
  Next dev manifest and caused a transient `500`; restarting dev restored
  `HTTP 200`.

### Patterns Established

- Document conversion tools should start hidden and browser-local until real
  documents prove quality.
- Generated files can stay in React state and download through Blob URLs for
  first-pass private utilities.
- Image assets should use stable relative paths from the first implementation,
  even before public promotion.

### Key Lessons

1. Hidden utility routes are useful for validating risky-feeling features before
   exposing them in the public tool catalog.
2. For file tools, privacy boundaries should be visible in both UI copy and code
   review evidence.
3. Avoid mixing `next dev` and `next build` against the same `.next` directory
   when using the dev server for route checks.

### Cost Observations

- Model mix: Not tracked.
- Sessions: Not tracked.
- Notable: Most implementation was straightforward; verification complexity
  came from browser tooling instability and local fixture generation.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.2 | Not tracked | 4 | Tools branch moved from concept hub to shipped utility catalog |
| v1.3 | Not tracked | 3 | Hidden tools can validate file-processing utility before public promotion |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.2 | Manual UAT + typecheck/lint/build | No automated coverage | Static style prompt data and preview assets |
| v1.3 | Local smoke tests + typecheck/lint/build | No automated coverage | Browser-local Word conversion and zip export |

### Top Lessons (Verified Across Milestones)

1. Keep the homepage at branch-level navigation; put specific tools inside
   their branch pages.
2. For public-first tools, avoid uploads, arbitrary execution, and persistence
   until those boundaries are intentionally designed.
3. Keep file-processing tools hidden until representative real-document UAT
   confirms quality.
