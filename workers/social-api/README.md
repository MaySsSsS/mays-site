# mays-social-api

PSN / 任天堂的**个人游戏数据后端**：一次性登录导入凭证 → 加密存 D1 → 定时采集游玩时长与游戏信息 → 站点读快照。

## 为什么需要它

- PSN 的游玩时长只在 `gamelist/v2/users/me/titles` 的 `playDuration` 里（`PT228H56M33S`），要 OAuth 令牌才能读。
- 任天堂要在 Parental Controls（moon）里读每日汇总；Switch 2 的游玩时长在 `devicePlayers[].playedApps[].playingTime`。
- 两家都要**长效凭证**，只能放在服务端。凭证用 AES-GCM 加密后存 D1（`TOKEN_ENC_KEY` 在 Worker secret 里，不入库）。

## 接口

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/health` | 公开（带 `Authorization` 时多返回错误详情） | 各平台状态 |
| GET | `/api/snapshot/{psn,nintendo}` | 公开 | 前端读的快照，`max-age=300` |
| POST | `/api/link/psn` | `Bearer ADMIN_TOKEN` | body `{ "npsso": "..." }` |
| POST | `/api/link/nintendo` | `Bearer ADMIN_TOKEN` | body `{ "sessionTokenCode": "...", "codeVerifier": "..." }` 或 `{ "sessionToken": "..." }` |
| POST | `/api/collect` | `Bearer ADMIN_TOKEN` | body `{}` 全采，`{ "platform": "psn" }` 单采 |
| DELETE | `/api/link/{platform}` | `Bearer ADMIN_TOKEN` | 解绑并删除凭证 |

定时采集：`[triggers] crons = ["0 2,8,14,20 * * *"]`（UTC，每天 4 次）。

## 运维

```bash
# 首次：建库并回填 wrangler.toml 的 database_id
npx wrangler@4.81.1 d1 create mays-social-db
npx wrangler@4.81.1 d1 execute mays-social-db --remote --file workers/social-api/schema.sql

# 两个密钥（值只进 Worker secret，不写仓库）
openssl rand -hex 32 > /tmp/admin_token      # → ADMIN_TOKEN
openssl rand -base64 32 > /tmp/enc_key       # → TOKEN_ENC_KEY（必须 32 字节 base64）
npx wrangler@4.81.1 secret put ADMIN_TOKEN -c workers/social-api/wrangler.toml
npx wrangler@4.81.1 secret put TOKEN_ENC_KEY -c workers/social-api/wrangler.toml

# 部署
npx wrangler@4.81.1 deploy -c workers/social-api/wrangler.toml
```

`TOKEN_ENC_KEY` 丢了就只能重新登录一次（旧密文解不开）；轮换它等于让所有凭证失效。

## 数据形状

```ts
SocialSnapshot {
  platform: "psn" | "nintendo";
  profile: { name: string; avatarUrl: string | null } | null;
  games: { id; name; imageUrl; bannerUrl; minutes; lastPlayedAt }[];
  totalMinutes: number;
  gameCount: number;
  generatedAt: string;
}
```

**失败不会清空数据**：采集失败只更新 `status`（`needs_relogin` / `error`），上一份快照继续给前端用；`needs_relogin` 只在明确 401/403 或 `invalid_grant` 时出现，网络抖动、429、5xx 一律按可重试处理。
