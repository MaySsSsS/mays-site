---
phase: 06-accessibility-polish-and-verification
reviewed: "2026-05-03T02:44:33Z"
depth: standard
files_reviewed: 2
files_reviewed_list:
  - /Volumes/KIOXIA+MAIWO/projects/mays-site/styles/tools/hub.module.css
  - /Volumes/KIOXIA+MAIWO/projects/mays-site/styles/tools/qr.module.css
findings:
  critical: 0
  warning: 5
  info: 0
  total: 5
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-05-03T02:44:33Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the two changed CSS modules in context with the Tools hub and QR Studio pages. No blocker-level security issue was found in the scoped CSS, but the styles contain one user-visible QR preview bug, incomplete reduced-motion handling in both surfaces, and stale CSS left from copied selectors.

## Warnings

### WR-01: [WARNING] QR preview ignores the selected size

**File:** `/Volumes/KIOXIA+MAIWO/projects/mays-site/styles/tools/qr.module.css:364`
**Issue:** `.svgPreview :global(svg)` forces every generated QR SVG to `width: min(100%, 360px)`. `QrStudio` generates SVG markup with a width derived from the Size slider (`160` through `520`), so this CSS overrides the generated dimensions and makes the live preview render at the same capped size instead of reflecting the selected output size.
**Fix:**
```css
.svgPreview :global(svg) {
  max-width: 100%;
  height: auto;
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
}
```

### WR-02: [WARNING] Hub reduced-motion mode still moves focused and hovered elements

**File:** `/Volumes/KIOXIA+MAIWO/projects/mays-site/styles/tools/hub.module.css:381`
**Issue:** The reduced-motion media query removes transitions for `.backLink` and `.liveCard`, but the hover/focus rules at lines 76-80 and 268-274 still apply `transform: translateY(...)`. Users who request reduced motion still get positional movement, just as an immediate jump.
**Fix:**
```css
@media (prefers-reduced-motion: reduce) {
  .backLink,
  .liveCard {
    transition: none;
  }

  .backLink:hover,
  .backLink:focus-visible,
  .liveCard:hover,
  .liveCard:focus-visible {
    transform: none;
  }
}
```

### WR-03: [WARNING] QR page reduced-motion mode still moves navigation links

**File:** `/Volumes/KIOXIA+MAIWO/projects/mays-site/styles/tools/qr.module.css:471`
**Issue:** The reduced-motion media query removes transitions for `.backLink` and `.backLinkSecondary`, but the hover/focus rules at lines 81-87 still apply `transform: translateY(-2px)`. Reduced-motion users still see layout movement on keyboard focus and hover.
**Fix:**
```css
@media (prefers-reduced-motion: reduce) {
  .backLink,
  .backLinkSecondary {
    transition: none;
  }

  .backLink:hover,
  .backLink:focus-visible,
  .backLinkSecondary:hover,
  .backLinkSecondary:focus-visible {
    transform: none;
  }
}
```

### WR-04: [WARNING] Hub CSS exports unused copied selectors

**File:** `/Volumes/KIOXIA+MAIWO/projects/mays-site/styles/tools/hub.module.css:118`
**Issue:** `.panelLabel` and `.metaLabel` are included in the hub typography selector, but `app/tools/page.tsx` does not consume either class. They appear to be copied from the QR module, where those classes are used, and now add stale CSS module exports to the hub stylesheet.
**Fix:** Remove the unused selectors from the hub grouping:
```css
.kicker,
.sectionLabel,
.cardEyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
```

### WR-05: [WARNING] QR mobile breakpoint contains dead flex/grid declarations

**File:** `/Volumes/KIOXIA+MAIWO/projects/mays-site/styles/tools/qr.module.css:431`
**Issue:** The mobile breakpoint applies `grid-template-columns: 1fr` to `.topline` and `.previewMeta`, but both selectors are flex containers in this module. The declaration has no effect for those selectors and makes the breakpoint harder to reason about.
**Fix:** Split the grid-only and flex-only selectors:
```css
@media (max-width: 720px) {
  .sliderGrid,
  .colorGrid {
    grid-template-columns: 1fr;
  }

  .topline,
  .actions,
  .previewMeta {
    flex-direction: column;
    align-items: stretch;
  }
}
```

---

_Reviewed: 2026-05-03T02:44:33Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
