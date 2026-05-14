# Codebase Map: Structure

Date: 2026-05-01

## Summary

The repository is organized by Next.js App Router routes, feature components,
shared libraries, Zustand stores, shared types, CSS Module styles, static data,
standalone Workers, and operational scripts. The top-level app is intentionally
flat rather than a package monorepo.

## Top-Level Layout

- `app/` contains all Next.js App Router routes and layouts.
- `components/` contains React feature components.
- `lib/` contains pure helpers and API clients.
- `stores/` contains Zustand stores.
- `types/` contains shared TypeScript interfaces.
- `styles/` contains CSS Modules grouped by site area.
- `public/` contains static data and headers.
- `workers/` contains independent Cloudflare Worker projects.
- `scripts/` contains Node.js operational scripts.
- `.github/workflows/` contains CI and deploy workflows.
- `.planning/codebase/` contains this generated codebase map.

## App Directory

- `app/layout.tsx` defines the root HTML shell and metadata.
- `app/globals.css` defines global variables and base styles.
- `app/page.tsx` renders the main portal.
- `app/not-found.tsx` renders a portal-styled 404.
- `app/(game)/layout.tsx` wraps game routes in `GameShell`.
- `app/(game)/game/page.tsx` renders the game dashboard.
- `app/(game)/games/page.tsx` renders the game library.
- `app/(photo)/layout.tsx` wraps photo routes in `PhotoShell`.
- `app/(photo)/photos/page.tsx` renders the photo client.

## Components Directory

- `components/game/` contains the game subsite UI.
- `components/game/GameShell.tsx` owns game navigation and status bar.
- `components/game/GameHome.tsx` owns dashboard sections and stats display.
- `components/game/GameLibrary.tsx` owns search, sorting, filtering, and pagination.
- `components/game/GameCard.tsx` renders one store-linked game card.
- `components/game/FeaturedGame.tsx` renders featured game modules.
- `components/photo/` contains the photo subsite UI.
- `components/photo/PhotoShell.tsx` owns photo navigation and footer.
- `components/photo/PhotosClient.tsx` orchestrates photo auth, map, groups, gallery, upload, and lightbox.
- `components/photo/ChinaMap.tsx` owns ECharts map rendering.
- `components/photo/CitySelector.tsx` owns city picker modal behavior.
- `components/photo/PhotoAuth.tsx` owns password login UI.
- `components/photo/PhotoUploader.tsx` owns drag-and-drop image selection and preview.
- `components/photo/PhotoLightbox.tsx` owns modal image viewing and keyboard navigation.
- `components/photo/PhotoAsset.tsx` resolves local preview URLs and Worker blob URLs.

## Libraries Directory

- `lib/game.ts` contains Steam/game helpers and the default Game API URL.
- `lib/steam-data.ts` is server-only and imports the static Steam snapshot.
- `lib/photo.ts` contains photo localStorage helpers, sample data, city coordinates, and counters.
- `lib/photo-api.ts` contains the browser API client for the Photo Worker.

## Stores Directory

- `stores/steam-store.ts` owns game data hydration, remote fetch, fallback fetch, and derived selectors.
- `stores/photo-store.ts` owns photo groups, sync state, group mutations, photo mutations, and sample data initialization.
- `stores/auth-store.ts` owns photo auth initialization, login, and logout.

## Types Directory

- `types/steam.ts` defines Steam data and derived game stats types.
- `types/photo.ts` defines photo, group, city coordinate, and upload input types.

## Styles Directory

- `styles/portal.module.css` styles the root portal and 404 page.
- `styles/game/` contains game shell, dashboard, library, card, and featured card styles.
- `styles/photo/` contains photo shell, auth, city selector, map, uploader, lightbox, and page styles.
- `app/globals.css` is the only global stylesheet.

## Public Directory

- `public/data/steam-games.json` is the Steam snapshot consumed by the server app and client fallback.
- `public/data/china-geojson.json` is consumed by `components/photo/ChinaMap.tsx`.
- `public/_headers` configures long-lived cache headers for Next static assets.

## Workers Directory

- `workers/game-api/package.json` contains the Game Worker scripts and dev dependencies.
- `workers/game-api/tsconfig.json` is independent from the root app.
- `workers/game-api/wrangler.toml` binds the `GAME_BUCKET` R2 bucket.
- `workers/game-api/src/index.ts` implements Steam data read/upload endpoints.
- `workers/photo-api/package.json` contains the Photo Worker scripts and dev dependencies.
- `workers/photo-api/tsconfig.json` is independent from the root app.
- `workers/photo-api/wrangler.toml` binds the `PHOTO_BUCKET` R2 bucket.
- `workers/photo-api/src/index.ts` implements auth, group metadata, image upload, image read, and image delete endpoints.

## Scripts Directory

- `scripts/fetch-steam-data.js` fetches Steam data and writes the local snapshot.
- `scripts/fetch-city-coordinates.js` fetches city coordinates from Nominatim and writes a generated JSON file.

## Documentation And Harness Files

- `AGENTS.md` and `CLAUDE.md` are intended to stay byte-for-byte synchronized.
- `PROGRESS.md` is the session state handoff document.
- `HARNESS-TODO.md` tracks harness and agent workflow improvements.
- `README.md` describes the app layout, but currently contains stale framework version wording.
- `DEVELOPMENT.md` contains older Vue-era plan history and is not the current architecture source of truth.
- `DEPLOYMENT.md` explains Cloudflare and GitHub deployment paths, but contains some stale framework version wording.

## Naming Conventions

- React components use PascalCase filenames.
- CSS Modules mirror component or page names.
- Zustand stores use kebab-case filenames with `-store` suffix.
- Types use domain filenames such as `steam.ts` and `photo.ts`.
- Worker directories are named by API domain: `game-api` and `photo-api`.
- App route groups use parenthesized Next.js group folders: `(game)` and `(photo)`.
