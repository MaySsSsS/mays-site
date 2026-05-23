# mays-signal-arena-api

Cloudflare Worker，用于承载 Signal Arena 的公开看板和云端 AI Trader Runner。

## 依赖资源

- D1 数据库，绑定名为 `SIGNAL_ARENA_DB`
- KV Namespace，绑定名为 `SIGNAL_ARENA_KV`
- Secrets：
  - `SIGNAL_ARENA_AGENT_API_KEY`
  - `SIGNAL_ARENA_AI_API_KEY`
  - `SIGNAL_ARENA_ADMIN_TOKEN`

## 本地检查

```bash
pnpm --dir workers/signal-arena-api install
pnpm typecheck:signal-arena-worker
pnpm test:signal-arena-worker
```

## Dry run

```bash
curl -X POST "$SIGNAL_ARENA_API_URL/api/admin/run?dryRun=true" \
  -H "Authorization: Bearer $SIGNAL_ARENA_ADMIN_TOKEN"
```

Dry run 会写入一条运行日志，但不会提交交易。
