.PHONY: dev typecheck lint build check preview deploy dev-game-api dev-photo-api

dev:
	pnpm dev

typecheck:
	pnpm typecheck

lint:
	pnpm lint

build:
	pnpm build

check: typecheck lint build

preview: build
	pnpm preview

deploy: build
	pnpm deploy

dev-game-api:
	pnpm dev:game-api

dev-photo-api:
	pnpm dev:photo-api
