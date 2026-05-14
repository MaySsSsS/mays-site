# Codebase Map: Concerns

Date: 2026-05-01

## Summary

The codebase is coherent and small, but the highest-priority concerns are stale
documentation, no automated tests, Worker code outside root verification, auth
and token implementation details in the Photo Worker, and local-first photo sync
semantics that can diverge from remote R2 state.

## Documentation Drift

- `README.md` says the project uses Next.js 14 and React 18.
- `package.json` actually uses Next.js `15.5.15` and React `19.2.5`.
- `DEPLOYMENT.md` also contains Next.js 14 wording.
- `DEVELOPMENT.md` mostly documents the earlier Vue/Vite/Pinia project state.
- `AGENTS.md` and `CLAUDE.md` appear to be the most current architecture source.
- Risk: future agents or contributors may follow stale docs and make wrong implementation choices.

## Test Coverage Gap

- No application test files are present.
- No root `test` script exists in `package.json`.
- `HARNESS-TODO.md` tracks Vitest and Playwright work, but it is not implemented yet.
- Risk: changes to stores, middleware, and Worker contracts rely on manual validation.

## Worker Verification Gap

- Root `tsconfig.json` excludes `workers`.
- Worker package manifests do not define `typecheck`.
- `make check` does not validate Worker TypeScript.
- Risk: Worker code can break independently while root L1-L3 verification still passes.

## Lint Command Maintenance

- `pnpm lint` runs `next lint`.
- Next.js reports that `next lint` is deprecated and will be removed in Next.js 16.
- There is no explicit root ESLint config checked into the repository.
- Risk: a future Next upgrade can break the documented L2 verification command.

## Photo Auth Implementation

- `workers/photo-api/src/index.ts` implements JWT-like tokens manually with `btoa`, `atob`, and Web Crypto.
- Payload and header are base64 encoded, but not fully base64url-normalized.
- Token signing secret falls back to `AUTH_PASSWORD + "-jwt-secret"` if `JWT_SECRET` is not set.
- Risk: token compatibility and security properties depend on local implementation details.
- Mitigation: set `JWT_SECRET` explicitly and consider a small vetted JOSE/JWT library if Worker bundle constraints allow it.

## Photo Sync Semantics

- `stores/photo-store.ts` mutates local Zustand state and localStorage before remote sync.
- Failed `saveGroups` calls leave local changes in place and set an error.
- `addPhoto` uploads the image before adding metadata locally.
- `removePhoto` ignores image delete failure and still removes metadata locally.
- Risk: browser localStorage, R2 metadata, and R2 image objects can diverge.
- This is an intentional local-first behavior per `AGENTS.md`, but it needs tests and recovery UX.

## Photo Upload Preview URL Lifetime

- `components/photo/PhotoUploader.tsx` stores object preview URLs in photo metadata payloads through `url: item.previewUrl`.
- After upload, `resetFields(false)` intentionally does not revoke previews.
- Preview URLs are browser-session object URLs and are not durable across reloads.
- Risk: locally stored photo records may temporarily contain object URLs that cannot be restored later.
- Mitigation: clarify whether `url` is only for immediate previews or should be omitted after successful Worker upload.

## Worker Input Validation

- `workers/game-api/src/index.ts` accepts raw POST text and writes it directly to R2 as JSON.
- `workers/photo-api/src/index.ts` stores request JSON body for groups without schema validation.
- Photo upload accepts `groupId` and `photoId` from form data and builds an R2 key.
- Risk: malformed metadata or unexpected object keys can be stored if authenticated clients send bad input.

## CORS Configuration Risks

- Both Workers include `env.CORS_ORIGIN` in `allowedOrigins`.
- If `env.CORS_ORIGIN` is missing or empty, fallback origin can be undefined or invalid.
- Development origins include `http://localhost:5173` and `http://localhost:3000`.
- Risk: environment misconfiguration can produce incorrect CORS behavior.

## Deployment Drift

- Root app uses Wrangler `^4.81.1`.
- Worker packages use Wrangler `^3.0.0` and `^3.91.0`.
- Worker compatibility dates are `2024-01-01`.
- Frontend compatibility date is `2026-04-12`.
- Risk: runtime behavior and local dev behavior can differ between frontend and API Workers.

## Static Snapshot Freshness

- Server-rendered game pages read `public/data/steam-games.json` through `lib/steam-data.ts`.
- CI updates the snapshot daily only if the Steam workflow succeeds.
- Client store can fetch Worker data, but server-rendered initial UI depends on the static snapshot.
- Risk: dashboard initial render can lag behind Worker data.

## Map Rendering Risks

- `components/photo/ChinaMap.tsx` fetches `/data/china-geojson.json` and caches the promise at module scope.
- ECharts map registration uses `geoJson as never`.
- The effect dependencies serialize visited cities and counts with `JSON.stringify`.
- Risk: malformed GeoJSON or large city payloads could cause runtime-only failures not covered by current checks.

## Accessibility And UI Risks

- Some icon-only or symbolic buttons use close, menu, and upload glyphs as visible text.
- Several buttons have good `aria-label` coverage, but not all symbolic buttons do.
- Risk: keyboard and screen reader behavior needs manual or automated accessibility review.

## Secrets Handling

- No secret values were observed in source files during this map.
- Secrets are referenced by environment variable names in docs and workflows.
- Generated docs should continue to refer to secret names only.
