# Codebase Map: Architecture

Date: 2026-05-01

## Summary

The repository is a monolithic Next.js App Router frontend plus two independent
Cloudflare Worker APIs. The frontend renders a portal, a game dashboard/library,
and a photo journal. Domain selection happens in middleware. Game pages start
from server-side snapshot data and hydrate a client store. Photo pages are fully
client-oriented and sync localStorage with the Photo API Worker.

## System Boundaries

- Frontend application boundary:
  - `app/`
  - `components/`
  - `lib/`
  - `stores/`
  - `types/`
  - `styles/`
- Game API boundary:
  - `workers/game-api/`
- Photo API boundary:
  - `workers/photo-api/`
- Data and static asset boundary:
  - `public/data/`
  - `public/_headers`
- Operational scripts:
  - `scripts/fetch-steam-data.js`
  - `scripts/fetch-city-coordinates.js`

## Entry Points

- Root app layout: `app/layout.tsx`.
- Root portal page: `app/page.tsx`.
- Game layout shell: `app/(game)/layout.tsx`.
- Game dashboard route: `app/(game)/game/page.tsx`.
- Game library route: `app/(game)/games/page.tsx`.
- Photo layout shell: `app/(photo)/layout.tsx`.
- Photo page route: `app/(photo)/photos/page.tsx`.
- Domain middleware: `middleware.ts`.
- 404 page: `app/not-found.tsx`.
- Game Worker fetch handler: `workers/game-api/src/index.ts`.
- Photo Worker fetch handler: `workers/photo-api/src/index.ts`.

## Routing Architecture

- `middleware.ts` is intentionally narrow.
- It only matches `/`.
- It rewrites `game.*` to `/game`.
- It rewrites `photo.*` to `/photos`.
- It leaves every other request path unchanged.
- In-app links still use path-based routes such as `/game`, `/games`, `/photos`, and `/`.

## Rendering Model

- Game pages are async server components at the route level:
  - `app/(game)/game/page.tsx`
  - `app/(game)/games/page.tsx`
- Game pages export `revalidate = 3600` for ISR.
- Game pages call `getSteamGamesData` from `lib/steam-data.ts`.
- Game UI components such as `components/game/GameHome.tsx` and `components/game/GameLibrary.tsx` are client components.
- Photo page entry `app/(photo)/photos/page.tsx` renders `components/photo/PhotosClient.tsx`.
- `PhotosClient` is a client component and owns auth, group selection, map selection, upload, and lightbox state.

## Game Data Flow

- `public/data/steam-games.json` is imported by `lib/steam-data.ts`.
- `getSteamGamesData` normalizes the snapshot into `SteamDataPayload`.
- Server routes pass the snapshot as `initialData` to `GameHome` or `GameLibrary`.
- Client components hydrate `useSteamStore` from `initialData`.
- If `initialData.games` is empty, `useSteamStore.fetchGamesData` tries the Game API Worker.
- If the Worker request fails, the client falls back to `/data/steam-games.json`.
- UI statistics are computed by pure helpers in `lib/game.ts`.

## Photo Data Flow

- Auth state lives in `stores/auth-store.ts`.
- Photo groups live in `stores/photo-store.ts`.
- Browser storage helpers live in `lib/photo.ts`.
- Worker API client functions live in `lib/photo-api.ts`.
- `PhotosClient` initializes auth and hydrates local groups on mount.
- If unauthenticated and there are no groups, sample groups are created by `createSampleGroups`.
- If authenticated, `fetchFromApi` loads remote groups, persists them locally, and updates the store.
- Mutations update local state and localStorage first, then attempt Worker persistence.
- Photo binaries upload to R2 through `uploadPhoto`.
- Photo display resolves either `photo.url` or a Worker blob URL through `PhotoAsset`.

## Component Architecture

- Game shell and navigation are in `components/game/GameShell.tsx`.
- Game dashboard composition is in `components/game/GameHome.tsx`.
- Game library filtering and pagination are in `components/game/GameLibrary.tsx`.
- Reusable game cards are `components/game/GameCard.tsx` and `components/game/FeaturedGame.tsx`.
- Photo shell and navigation are in `components/photo/PhotoShell.tsx`.
- Photo orchestration is centralized in `components/photo/PhotosClient.tsx`.
- Heavy photo subcomponents are dynamically imported:
  - `components/photo/ChinaMap.tsx`
  - `components/photo/PhotoLightbox.tsx`
  - `components/photo/PhotoUploader.tsx`

## Worker Architecture

- Workers are standalone Cloudflare fetch handlers.
- Workers do not import root app modules or the `@/*` alias.
- Each Worker declares its own `Env` interface.
- Each Worker defines CORS headers locally.
- Game Worker serves and writes a single R2 JSON object.
- Photo Worker implements password auth, token verification, metadata JSON storage, and image object CRUD.

## Deployment Architecture

- Frontend deploy is OpenNext on Cloudflare Workers.
- `wrangler.jsonc` points the frontend Worker to `.open-next/worker.js`.
- `open-next.config.ts` uses `defineCloudflareConfig`.
- `.github/workflows/deploy-frontend.yml` deploys on `main`.
- `.github/workflows/deploy.yml` updates Steam data on a schedule.
- API Workers are deployed separately with their own Wrangler configs.

## Important Coupling

- `types/steam.ts` must match the shape of `public/data/steam-games.json` and the Game API response.
- `types/photo.ts` must match Photo Worker metadata shape in `workers/photo-api/src/index.ts`.
- `lib/photo-api.ts` endpoint paths must stay aligned with `workers/photo-api/src/index.ts`.
- `lib/game.ts` API URL defaults must stay aligned with Game Worker deployment.
- Middleware behavior must stay aligned with the domain strategy in `AGENTS.md`.

## Error Handling Shape

- Frontend stores generally capture user-facing error strings in Zustand state.
- Worker handlers return JSON error responses with status codes.
- Worker catch blocks log server-side errors with `console.error`.
- Photo localStorage helpers swallow parse failures and return empty arrays.
- Photo store often preserves local changes even if Worker sync fails.
