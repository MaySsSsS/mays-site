# Codebase Map: Conventions

Date: 2026-05-01

## Summary

The active conventions are strict TypeScript, App Router pages, client component
boundaries for interactive UI, Zustand for state, pure helpers in `lib/`, CSS
Modules for styling, and independent Worker projects. The repository prefers
explicit simple data flow over broad abstractions.

## TypeScript Conventions

- Root TypeScript runs in strict mode through `tsconfig.json`.
- Application types are declared in `types/steam.ts` and `types/photo.ts`.
- Component props generally use inline `Readonly<{ ... }>` object types.
- Shared payload types are imported with `import type`.
- Root app code uses the `@/*` path alias.
- Worker code avoids the root `@/*` alias and declares local interfaces.
- `any` is not used in source files; unknown data is usually normalized with `unknown` plus casts.

## React And Next.js Conventions

- App Router pages are small route adapters.
- Layout shells are separated by domain:
  - `components/game/GameShell.tsx`
  - `components/photo/PhotoShell.tsx`
- Interactive components start with `"use client"`.
- Heavy photo components are dynamically imported in `components/photo/PhotosClient.tsx`.
- Server-only Steam snapshot access is isolated in `lib/steam-data.ts`.
- ISR is declared at route level with `export const revalidate = 3600`.

## State Conventions

- Zustand stores live under `stores/`.
- Stores expose state fields plus imperative actions.
- Game routes pass server data to client components as `initialData`.
- `useSteamStore.hydrate` seeds the client store from server data.
- Photo store mutating actions update local state and localStorage before attempting remote sync.
- Auth token storage is isolated in `lib/photo-api.ts`.

## Helper Function Conventions

- Pure game formatting and selection helpers live in `lib/game.ts`.
- Photo storage and city helpers live in `lib/photo.ts`.
- Worker API calls are isolated in `lib/photo-api.ts`.
- Data normalization exists in both `lib/steam-data.ts` and `stores/steam-store.ts`.
- Helper functions generally return plain objects, arrays, strings, or promises without class wrappers.

## Styling Conventions

- Feature styles use CSS Modules.
- Global CSS is limited to `app/globals.css`.
- Game styles use terminal/game-oriented tokens and labels.
- Photo styles use warmer paper/map-oriented tokens.
- Portal styles live in `styles/portal.module.css`.
- Components import styles directly from their matching CSS Module.

## Error Handling Conventions

- Frontend client API failures are caught and turned into user-facing string state.
- `stores/steam-store.ts` falls back from Worker API to static JSON.
- `stores/photo-store.ts` falls back from Worker API to localStorage or sample groups.
- Photo image loading failures display a fallback through `components/photo/PhotoAsset.tsx`.
- Worker handlers return JSON responses with explicit status codes.
- Worker catch blocks log server-side errors and return `500` JSON payloads.

## API Conventions

- Frontend API base URLs use `NEXT_PUBLIC_*` overrides with production defaults.
- Worker endpoints are path-based under `/api`.
- CORS is handled explicitly in each Worker.
- Game upload uses bearer token auth.
- Photo auth uses password exchange for a bearer token.
- Photo metadata and photo binaries are separate R2 objects.

## Data Shape Conventions

- Steam payload shape is `SteamDataPayload` with `games`, `player`, and `lastUpdated`.
- Steam data normalization accepts both `player` and older `playerInfo` keys.
- Photo group shape is `PhotoGroup` with `id`, `name`, `city`, optional `location`, `photos`, and `createdAt`.
- Photo records may have a `url` for local preview/sample data or be resolved from Worker storage by id.
- City coordinates are kept in `CHINA_CITIES` in `lib/photo.ts`.

## Documentation Conventions

- `AGENTS.md` and `CLAUDE.md` must stay synchronized.
- `PROGRESS.md` should be read at session start and updated before session end.
- Verification expectations are documented in `AGENTS.md`.
- `Makefile` provides a stable wrapper over project verification commands.

## Command Conventions

- Use `pnpm` for root app dependency and script execution.
- Use `make check` for full verification when finishing work.
- Use `pnpm --dir workers/game-api dev` through `pnpm dev:game-api` for the Game Worker.
- Use `pnpm --dir workers/photo-api dev` through `pnpm dev:photo-api` for the Photo Worker.

## Known Inconsistencies In Conventions

- `README.md` says Next.js 14 and React 18, while `package.json` uses Next.js 15 and React 19.
- `DEPLOYMENT.md` also contains Next.js 14 wording.
- Some legacy documentation in `DEVELOPMENT.md` still references Vue, Vite, and Pinia.
- Worker formatting uses trailing commas in several object literals, while app code generally omits trailing commas.
