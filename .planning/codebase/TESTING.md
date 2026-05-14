# Codebase Map: Testing

Date: 2026-05-01

## Summary

The repository currently relies on static verification rather than automated
unit, integration, or end-to-end tests. The required verification ladder is
typecheck, lint, and production build. Test framework installation is explicitly
tracked as future work in `HARNESS-TODO.md`.

## Current Verification Commands

- `pnpm typecheck` runs `tsc --noEmit`.
- `pnpm lint` runs `next lint`.
- `pnpm build` runs `next build`.
- `make check` runs `typecheck`, then `lint`, then `build`.
- `Makefile` is the canonical command wrapper.

## Required Verification Ladder

- L1: `pnpm typecheck`.
- L2: `pnpm lint`.
- L3: `pnpm build`.
- `AGENTS.md` states that later layers should not run until earlier layers pass.
- Definition of Done requires L1 through L3 plus no debug code residue.

## Existing Test Files

- No application test files are present under `app/`, `components/`, `lib/`, `stores/`, `workers/`, or `scripts/`.
- There is no `vitest.config.ts`.
- There is no Playwright config in the active root app.
- There are no package scripts named `test`, `unit`, or `e2e` in `package.json`.

## Linting

- Lint script is `next lint` from `package.json`.
- `next lint` is deprecated in newer Next.js versions and prints a migration warning.
- There is no explicit root ESLint config file in the repository.
- `eslint` and `eslint-config-next` are installed in `package.json`.

## Type Checking

- Root app typecheck excludes `workers` in `tsconfig.json`.
- Worker TypeScript configs are independent, so root `pnpm typecheck` does not validate Worker source.
- Worker package manifests do not define a `typecheck` script.
- Root strict mode catches most app-level typing issues.

## Build Verification

- `pnpm build` runs `next build`.
- Frontend deploy scripts run OpenNext build before preview, deploy, or upload.
- `pnpm preview` and `pnpm deploy` are deployment-oriented and are not part of `make check`.

## CI Verification

- `.github/workflows/deploy-frontend.yml` installs dependencies and runs `pnpm run deploy`.
- The frontend deploy workflow does not separately run `pnpm typecheck`, `pnpm lint`, or `pnpm build`.
- `.github/workflows/deploy.yml` installs dependencies and runs `node scripts/fetch-steam-data.js`.
- The Steam data workflow commits only `public/data/steam-games.json` when changed.

## Manual Testing Paths

- Portal path: open `/` and verify links to `/game` and `/photos`.
- Game dashboard path: open `/game` and verify stats, recent activity, and featured games render from snapshot data.
- Game library path: open `/games` and verify search, sort, played-only filtering, and pagination.
- Photo unauthenticated path: open `/photos` without token and verify auth UI and sample-data behavior.
- Photo authenticated path: log in, fetch groups, create groups, upload photos, open lightbox, delete photos, and verify localStorage/Worker sync.
- Domain routing path: request `/` on `game.*` and `photo.*` hosts and verify middleware rewrites.

## High-Value Future Test Targets

- `lib/game.ts`: `buildGameStats`, `getTopGames`, `getRecentlyPlayedGames`, `formatPlaytime`, and date formatting.
- `lib/photo.ts`: localStorage load/save error handling, `countCityPhotos`, and sample data shape.
- `middleware.ts`: host-based root rewrites for main, game, and photo domains.
- `stores/steam-store.ts`: Worker-first fetch and static fallback behavior.
- `stores/photo-store.ts`: local-first writes and remote sync failure handling.
- `workers/game-api/src/index.ts`: CORS, unauthorized upload, missing data, and successful data read.
- `workers/photo-api/src/index.ts`: auth, token expiry, group metadata CRUD, image upload, image read, and image delete.

## Harness Roadmap For Tests

- `HARNESS-TODO.md` tracks P4.1 to install Vitest, Testing Library, and related config.
- `HARNESS-TODO.md` tracks priority coverage for `stores/`, `lib/`, `middleware.ts`, and Workers.
- `HARNESS-TODO.md` tracks later Playwright coverage for portal to Game and Photo login/map flows.

## Testing Risks

- Worker code can regress without root `pnpm typecheck` noticing.
- Photo local-first sync behavior is important and currently untested.
- Middleware domain behavior is central to deployment and currently untested.
- The ECharts map is dynamic and browser-only, so it needs browser-level verification when changed.
- `next lint` deprecation means the lint command itself is a future maintenance item.
