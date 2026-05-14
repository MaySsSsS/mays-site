# MAYS UNIVERSE Site

## What This Is

This is the evolving main-site experience for the existing personal web system
across `maysssss.cn`, `/game`, and `/photos`.
The root domain acts as the comic-book entrance to that universe, while the
tools branch on the same domain expands the site into a practical prompt and
utility index instead of a presentation-only portal.

## Core Value

Distinct visual identity should never come at the cost of instantly
understandable navigation or tool usefulness.

## Current State

The current shipped site includes the comic-style root portal, Game, Photos,
the public Tools hub, QR Studio, Style Prompt Index, and a hidden
browser-local Word to Markdown converter at `/tools/word-to-markdown`.

The Word to Markdown tool is intentionally not promoted from `/tools` yet. It
is usable by direct route for private validation and real-document testing.

## Next Milestone Goals

- Decide whether the next milestone should polish/promote Word to Markdown,
  add another tools utility, or return to Game/Photos/portal work.
- If Word to Markdown is promoted, first run representative real-document UAT
  and write public-facing tool copy.
- Revisit R2/history/storage only after auth, privacy, retention, deletion, file
  size, and cost boundaries are designed.

## Requirements

### Validated

- Existing root portal exists at `app/page.tsx` and routes visitors to Game and
  Photos.
- Game subsite exists at `game.maysssss.cn` / `/game` with a Steam dashboard
  and library.
- Photo subsite exists at `photo.maysssss.cn` / `/photos` with photo groups,
  map, auth, and upload flows.
- Middleware already rewrites root subdomain requests to the proper route
  groups.
- CSS Modules, Next.js App Router, and the current design tokens are
  established project patterns.
- Root `maysssss.cn` now presents a first-viewport comic cover where
  `MAYS UNIVERSE` is the dominant visual subject -- v1.0.
- The cover prioritizes impact over explanation: no identity bio, no long copy,
  and no explicit feature explanation -- v1.0.
- The cover uses classic American comic visual language: oversized title
  treatment, heavy black outlines, dynamic composition, CMYK-inspired color,
  halftone print texture, and action-line energy -- v1.0.
- The page scrolls directly from cover into a "first page" panel directory
  rather than requiring a separate route or button -- v1.0.
- The panel directory uses irregular comic panels as entrances for `Game`,
  `Photos`, and future locked sections -- v1.0.
- `Game` and `Photos` panels are pure entrances with clear labels and minimal
  supporting text -- v1.0.
- Future panels remain unnamed and appear as sealed `Coming Soon` / `未完待续`
  entries -- v1.0.
- Coming Soon panels provide light feedback on hover or click, but do not
  navigate to another page -- v1.0.
- Copy is English-first; Chinese appears only where it improves clarity or the
  `未完待续` theme -- v1.0.
- The root portal remains polished on desktop and mobile, with no incoherent
  text overlap or broken panel composition -- v1.0.
- `maysssss.cn/tools` now exists as a readable tools hub framed as `Signal Lab`
  -- v1.1.
- `QR Studio` now exists at `/tools/qr` as the first public-safe utility
  -- v1.1.
- The homepage now exposes `Tools` as a real portal entrance while keeping one
  sealed future panel -- v1.1.
- `maysssss.cn/tools/style-prompt` now exists as a local style prompt index fed
  by static UI-Prompt-derived data -- v1.2.
- The style prompt page now uses preview images first, with safer fallback
  preview rendering only when a static image is missing -- v1.2.
- The style prompt page now uses a card gallery plus modal detail flow instead
  of split detail panes, keeping browsing and copying in one path -- v1.2.
- Browser-local `.docx` to Markdown conversion now works on the hidden
  `/tools/word-to-markdown` route, with Markdown inspection, copy, download,
  status, and warnings -- v1.3.
- The hidden Word to Markdown converter now extracts embedded images, rewrites
  Markdown references to `./assets/image-N.ext`, and exports Markdown plus
  assets as a zip -- v1.3.
- The Word to Markdown route remains hidden from `/tools` and the homepage
  until real-document UAT confirms conversion quality -- v1.3.

### Active

- [ ] Decide next milestone scope with `$gsd-new-milestone`.
- [ ] Test `/tools/word-to-markdown` with representative real documents before
  public promotion.

### Out of Scope

- Personal bio, resume, about-me content, or explicit identity explanation --
  this branch of the site remains utility- and entrance-focused.
- A `tools.` subdomain -- the current decision is to keep tools under
  `maysssss.cn/tools`.
- Server-side code execution or user-script sandboxes -- unsafe for the current
  public-facing scope.
- Word-to-Markdown uploads, cloud history, or persistent file storage -- v1.3 is
  local-only and hidden until conversion quality is verified.
- Automatic upstream sync from UI-Prompt -- local static data is sufficient for
  this milestone.
- Worker, R2, auth, database, or account features for the style prompt index --
  this tool should stay local, static, and public-safe.
- R2-backed conversion history for Word-to-Markdown -- privacy, auth, retention,
  file-size limits, and cost boundaries need a separate milestone.
- Changing Game or Photo product behavior -- this milestone only expands the
  tools branch.

## Context

The site now has a memorable root entrance and three live branches: Game,
Photos, and Tools. Inside Tools, there are two public-safe utilities:
`QR Studio` and `Style Prompt Index`.

The style prompt page is intentionally quieter than the holographic tools hub.
Its job is to help the user find, compare, preview, and copy UI prompt content
quickly, so the page itself should stay low-presence and let the catalog become
the main subject.

The underlying data is stored locally as static JSON plus generated preview
images. That keeps the tool fast, deployable on the existing frontend, and free
from auth, storage, or abuse-boundary work while still preserving the preview
language that made the original reference site useful.

`Word to Markdown` now exists as a hidden local converter route. It converts
`.docx` files in the browser, shows Markdown, copies/downloads Markdown,
extracts embedded images, and packages Markdown plus assets as a zip. It is
still hidden because conversion quality should be judged against real documents
before public promotion.

## Constraints

- **Tech stack**: Keep Next.js 15, React 19, TypeScript strict, and CSS Modules
  -- these are established project foundations.
- **Routing**: `middleware.ts` stays limited to subdomain route rewrites --
  tools should live on `maysssss.cn/tools` without new host routing logic.
- **Styling**: Use CSS Modules only; no Tailwind, styled-components, or global
  CSS-in-JS.
- **Safety**: The first public tool must avoid risky execution, upload, proxy,
  or storage behaviors.
- **Portal continuity**: Homepage changes should preserve the current comic-grid
  structure and keep at least one sealed future panel.
- **Validation**: Every implementation pass must satisfy `pnpm typecheck`,
  `pnpm lint`, and `pnpm build`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep `maysssss.cn` as an entrance page | The root domain should still frame the wider universe instead of becoming a generic list page | Good |
| Add tools under `/tools` instead of a new subdomain | Tools are an expansion of the main site, not a separate product boundary yet | Good |
| Use holographic film visuals for the tools branch | The user wants a futuristic, iridescent mood distinct from the comic portal and existing subsites | Good |
| Prioritize clear tool cards over pure concept art | The user explicitly wants a readable toolbox entrance, not an abstract visual-only page | Good |
| Start with a public QR generator | It is low-risk, broadly useful, and does not require auth, storage, or abuse-prone backend behavior | Good |
| Replace one sealed portal panel with `Tools` and keep one sealed panel | This exposes the new section without losing the portal's ongoing-universe feeling | Good |
| Skip research for this milestone | The selected QR generator scope is straightforward enough to move directly into requirements and planning | Good |
| Keep the style prompt data local as static assets | The current dataset size is small enough for frontend delivery and does not justify R2 or database work yet | Good |
| Use a low-presence layout for `/tools/style-prompt` | The page is an index for other UI styles, so its own visual identity should not compete with the catalog | Good |
| Prefer static preview images over live runtime demos | Stable images make the catalog more reliable and reduce blank or broken previews in the browsing grid | Good |
| Start Word to Markdown as a hidden local-only route | Conversion quality should be verified before exposing it publicly, and local-only processing avoids privacy/storage risk for the first version | Good |
| Use Mammoth and JSZip for hidden Word conversion | The browser-local stack covers `.docx`, image extraction, Markdown output, and zip packaging without backend storage | Good |
| Defer Word-to-Markdown history and R2 storage | Persistent document storage needs auth, retention, privacy, and abuse-boundary decisions that are outside this first converter slice | Good |
| Keep Word to Markdown hidden after v1.3 implementation | Local smoke tests pass, but public promotion should wait for representative real-document UAT | Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone**:
1. Full review of all sections.
2. Core Value check: still the right priority?
3. Audit Out of Scope: reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-05-10 after v1.3 Word to Markdown milestone*
