import { SocialApiError } from "./psn.js";

/**
 * `f` 参数是 NSO 客户端完整性校验：必须由官方 App 里的原生函数生成。
 * 社区标准做法是 nxapi 的 znca 服务（Frida 在 root 安卓上跑官方 App），
 * 这里把地址做成可配置，将来要自建只改 ZNCA_API_URL，业务代码不用动。
 */
/**
 * 默认用 imink 的公开 f 服务（与 nxapi 的 znca 服务接口兼容：POST /f，
 * body `{ token, hash_method }`，响应 `{ f, timestamp, request_id }`）。
 * nxapi 的公共服现在要求申请授权，imink 只要 User-Agent 里带上项目名/版本即可。
 * 自建 znca 服务时把 ZNCA_API_URL 指过去，接口形状一致，不用改代码。
 */
export const ZNCA_DEFAULT_URL = "https://api.imink.app";
const ZNCA_VERSION = "3.6.0";
const ZNCA_PLATFORM = "Android";
const ZNCA_CLIENT_VERSION = "d8fAZDPzwimzQ7c6";
const USER_AGENT = "mays-site/1.0 (+https://linkmays.com)";

export interface ZncaConfig {
  /** 覆盖默认服务地址（自建时用） */
  url?: string;
  /** 部分服务要求带访问令牌，我们自己的部署需要时再填 */
  apiKey?: string;
}

export interface ZncaF {
  f: string;
  timestamp: number;
  request_id: string;
}

/** 用 Nintendo Account 的 id_token 换一次性的 `f` 参数（约 15 分钟有效）。 */
export async function fetchZncaF(
  config: ZncaConfig,
  idToken: string,
  naId: string,
): Promise<ZncaF> {
  const base = (config.url ?? ZNCA_DEFAULT_URL).replace(/\/$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": USER_AGENT,
    "X-znca-Client-Version": ZNCA_CLIENT_VERSION,
    "X-znca-Platform": ZNCA_PLATFORM,
    "X-znca-Version": ZNCA_VERSION,
  };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const response = await fetch(`${base}/f`, {
    method: "POST",
    headers,
    // hash_method "1" = HashMethod.CORAL（NSO 客户端的登录方式）
    body: JSON.stringify({ hash_method: "1", token: idToken, na_id: naId }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const kind = response.status === 401 || response.status === 403
      ? "needs_relogin"
      : response.status === 429 || response.status >= 500
        ? "retryable"
        : "fatal";
    throw new SocialApiError(
      `获取 f 参数失败: HTTP ${response.status} ${body.slice(0, 200)}`,
      kind,
    );
  }

  const data = (await response.json()) as Partial<ZncaF>;
  if (!data.f || !data.timestamp || !data.request_id) {
    throw new SocialApiError("f 参数响应缺少 f/timestamp/request_id", "retryable");
  }
  return { f: data.f, timestamp: data.timestamp, request_id: data.request_id };
}