# Codebase Map: Stack

Date: 2026-05-01

## Summary

This repository is a single Next.js application for a three-domain personal site:
`maysssss.cn`, `game.maysssss.cn`, and `photo.maysssss.cn`.
The current runtime stack is Next.js 15, React 19, TypeScript strict mode,
Zustand, CSS Modules, ECharts, and Cloudflare Workers/OpenNext deployment.

## Languages And Runtimes

- TypeScript is used for the application, React components, stores, types, and Workers.
- JavaScript is used for operational scripts in `scripts/fetch-steam-data.js` and `scripts/fetch-city-coordinates.js`.
- Node.js is required for local development, build scripts, GitHub Actions, and data scripts.
- Cloudflare Workers runtime is used for the frontend worker and the two API workers.

## Application Framework

- App framework: Next.js `15.5.15` from `package.json`.
- React version: `19.2.5` from `package.json`.
- App Router is used under `app/`.
- Root layout and metadata live in `app/layout.tsx`.
- Root portal page lives in `app/page.tsx`.
- Route groups are used for domain-specific sections:
  - `app/(game)/game/page.tsx`
  - `app/(game)/games/page.tsx`
  - `app/(photo)/photos/page.tsx`

## State Management

- Zustand is the only application state library.
- Steam state lives in `stores/steam-store.ts`.
- Photo state lives in `stores/photo-store.ts`.
- Photo auth state lives in `stores/auth-store.ts`.
- Pure data helpers are kept in `lib/game.ts`, `lib/photo.ts`, and `lib/photo-api.ts`.

## Styling

- Global design tokens and base element styles live in `app/globals.css`.
- Component and page styling use CSS Modules only.
- Main style locations:
  - `styles/portal.module.css`
  - `styles/game/*.module.css`
  - `styles/photo/*.module.css`
- There is no Tailwind, styled-components, or CSS-in-JS dependency in `package.json`.

## Data Visualization

- ECharts `^6.0.0` is used by `components/photo/ChinaMap.tsx`.
- The China map GeoJSON is loaded from `public/data/china-geojson.json`.
- Heavy photo UI is dynamically imported with `ssr: false` in `components/photo/PhotosClient.tsx`.

## TypeScript Configuration

- Root TypeScript config is `tsconfig.json`.
- Root app uses `"strict": true`, `"moduleResolution": "bundler"`, and `"noEmit": true`.
- Root app excludes `workers` in `tsconfig.json`.
- The `@/*` alias maps to the repository root through `tsconfig.json`.
- Worker projects have independent TypeScript configs:
  - `workers/game-api/tsconfig.json`
  - `workers/photo-api/tsconfig.json`

## Next.js Configuration

- Next config lives in `next.config.mjs`.
- `reactStrictMode` is enabled.
- `images.unoptimized` is enabled for Cloudflare compatibility.
- Steam image hosts are whitelisted in `next.config.mjs`:
  - `avatars.steamstatic.com`
  - `steamcdn-a.akamaihd.net`
  - `cdn.cloudflare.steamstatic.com`

## Cloudflare Frontend Deployment

- OpenNext config lives in `open-next.config.ts`.
- Frontend Worker config lives in `wrangler.jsonc`.
- The frontend Worker is named `mays-site-web`.
- `wrangler.jsonc` enables `nodejs_compat` and `global_fetch_strictly_public`.
- Static asset headers are configured in `public/_headers`.

## API Worker Stack

- Game API Worker source is `workers/game-api/src/index.ts`.
- Photo API Worker source is `workers/photo-api/src/index.ts`.
- Worker configs live in:
  - `workers/game-api/wrangler.toml`
  - `workers/photo-api/wrangler.toml`
- Both Workers use R2 bindings and independent package manifests.
- Worker package manifests currently use Wrangler 3, while the root app uses Wrangler 4.

## Package Scripts

- `pnpm dev` starts Next.js development server.
- `pnpm typecheck` runs `tsc --noEmit`.
- `pnpm lint` runs `next lint`.
- `pnpm build` runs `next build`.
- `pnpm preview` runs OpenNext build and Cloudflare preview.
- `pnpm deploy` runs OpenNext build and Cloudflare deploy.
- `pnpm dev:game-api` delegates to `workers/game-api`.
- `pnpm dev:photo-api` delegates to `workers/photo-api`.
- `make check` runs `typecheck`, `lint`, and `build` in order through `Makefile`.

## Static Data

- Steam data snapshot lives in `public/data/steam-games.json`.
- China map GeoJSON lives in `public/data/china-geojson.json`.
- `lib/steam-data.ts` imports the Steam snapshot for server-side rendering.

## Important Version Notes

- `package.json` is the source of truth for framework versions.
- `README.md` and `DEPLOYMENT.md` still contain older wording that mentions Next.js 14 and React 18.
- `AGENTS.md` and `CLAUDE.md` describe the current architecture as Next.js 15 and React 19.
