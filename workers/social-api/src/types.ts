export type Platform = "psn" | "nintendo";

export interface SocialGame {
  id: string;
  name: string;
  /** 列表卡片图（PSN 用游戏图标、任天堂用 moon 的中图） */
  imageUrl: string | null;
  /** 详情背景图（PSN 用 4:3 横图；任天堂没有，留空） */
  bannerUrl: string | null;
  minutes: number;
  lastPlayedAt: string | null;
}

export interface SocialProfile {
  name: string;
  avatarUrl: string | null;
}

export interface SocialSnapshot {
  platform: Platform;
  profile: SocialProfile | null;
  games: SocialGame[];
  totalMinutes: number;
  gameCount: number;
  generatedAt: string;
}

export type PlatformState = "ok" | "needs_relogin" | "error" | "unlinked";

export interface PlatformStatus {
  platform: Platform;
  state: PlatformState;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
}

export interface PsnTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface Env {
  SOCIAL_DB: D1Database;
  /** 管理接口令牌：导入凭证、手动采集 */
  ADMIN_TOKEN?: string;
  /** 凭证加密密钥：32 字节随机值的 base64（44 字符） */
  TOKEN_ENC_KEY?: string;
  CORS_ORIGIN?: string;
  /** `f` 参数服务地址（默认公共 nxapi-znca-api，自建时覆盖） */
  ZNCA_API_URL?: string;
  /** `f` 参数服务的访问令牌（我们自己的部署需要时用） */
  ZNCA_API_KEY?: string;
  /** 只在调试时设置：输出更详细的日志 */
  DEBUG?: string;
}
