# mays-signal-arena-api

Cloudflare Worker，用于承载 Signal Arena 的公开看板和云端 Quant Lab Runner。

## 依赖资源

- D1 数据库，绑定名为 `SIGNAL_ARENA_DB`
- KV Namespace，绑定名为 `SIGNAL_ARENA_KV`
- Secrets：
  - `SIGNAL_ARENA_AGENT_API_KEY`
  - `SIGNAL_ARENA_ADMIN_TOKEN`

## Quant Lab

- 当前公开账号 scope：`quant-v1`
- 当前策略版本：`Q-Alpha v1`
- 每日买卖由确定性多因子策略与 `risk.ts` 程序风控决定，AI 不进入每日下单闭环。
- 后续若增加每周 AI 复盘，应作为独立研究任务接入，不进入每日下单闭环。

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
