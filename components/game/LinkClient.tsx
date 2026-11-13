"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  buildNintendoAuthorizeUrl,
  collectSocialData,
  createNintendoPkce,
  extractNintendoSessionTokenCode,
  fetchSocialHealth,
  linkNintendoAccount,
  linkPsnAccount,
  type SocialHealth,
  type SocialPlatform,
} from "@/lib/social-api";
import styles from "@/styles/game/link.module.css";

const TOKEN_STORAGE_KEY = "social-admin-token";
const VERIFIER_STORAGE_KEY = "social-nintendo-verifier";

const STATE_TEXT: Record<string, string> = {
  ok: "已绑定 · 采集正常",
  needs_relogin: "凭证失效，需要重新登录",
  error: "采集失败（自动重试）",
  unlinked: "未绑定",
};

export function LinkClient() {
  const [token, setToken] = useState("");
  const [health, setHealth] = useState<SocialHealth | null>(null);
  const [npsso, setNpsso] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [verifier, setVerifier] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await fetchSocialHealth());
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "读取状态失败" });
    }
  }, []);

  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "");
    setVerifier(window.sessionStorage.getItem(VERIFIER_STORAGE_KEY));
    void refreshHealth();
  }, [refreshHealth]);

  function rememberToken(value: string) {
    setToken(value);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
  }

  async function run(label: string, action: () => Promise<void>, success: string) {
    if (!token.trim()) {
      setMessage({ tone: "error", text: "先填管理令牌（ADMIN_TOKEN）" });
      return;
    }
    setBusy(label);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: success });
      await refreshHealth();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  }

  async function startNintendoLogin() {
    const { verifier: created, challenge } = createNintendoPkce();
    const state = crypto.randomUUID();
    window.sessionStorage.setItem(VERIFIER_STORAGE_KEY, created);
    setVerifier(created);
    const url = await buildNintendoAuthorizeUrl(state, await challenge);
    window.open(url, "_blank", "noopener,noreferrer");
    setMessage({
      tone: "ok",
      text: "已在新标签页打开任天堂登录页。登录后会跳到 npf…://auth 失败页，把地址栏整条 URL 复制回下面。",
    });
  }

  async function finishNintendoLogin() {
    const code = extractNintendoSessionTokenCode(callbackUrl);
    if (!code) {
      setMessage({ tone: "error", text: "没在粘贴的内容里找到 session_token_code" });
      return;
    }
    if (!verifier) {
      setMessage({ tone: "error", text: "找不到这次的 PKCE verifier，请重新点「开始任天堂登录」" });
      return;
    }
    await run(
      "nintendo",
      () => linkNintendoAccount(code, verifier, token),
      "任天堂账号已绑定，已发起首次采集（可能是空数据，等一下刷新状态）",
    );
    window.sessionStorage.removeItem(VERIFIER_STORAGE_KEY);
    setVerifier(null);
    setCallbackUrl("");
  }

  const platforms: { key: SocialPlatform; title: string; hint: string }[] = [
    { key: "psn", title: "PlayStation", hint: "只需要 NPSSO，60 天有效，每天 4 次自动采集" },
    { key: "nintendo", title: "Nintendo Switch", hint: "只需要登录一次，session token 长期有效" },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/games" className={styles.back}>
          ← 返回传送门
        </Link>
        <Link href="/" className={styles.back}>
          返回主站
        </Link>
      </header>

      <h1 className={styles.title}>绑定游戏账号</h1>
      <p className={styles.lead}>
        凭证加密后存在 D1，只用来读取游玩时长和游戏列表；好友、在线状态都不读取。
      </p>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>管理令牌</h2>
        <p className={styles.hint}>
          Worker 的 <code>ADMIN_TOKEN</code>，只存在这台浏览器的 localStorage 里，不会写进仓库。
        </p>
        <input
          className={styles.input}
          type="password"
          value={token}
          placeholder="Bearer 令牌"
          onChange={(event) => rememberToken(event.target.value)}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>当前状态</h2>
        <ul className={styles.statusList}>
          {platforms.map((platform) => {
            const status = health?.platforms?.[platform.key];
            return (
              <li key={platform.key} className={styles.statusItem}>
                <span>{platform.title}</span>
                <span className={styles[`state_${status?.state ?? "unlinked"}`] ?? ""}>
                  {STATE_TEXT[status?.state ?? "unlinked"] ?? status?.state}
                </span>
                <span className={styles.time}>{status?.lastSuccessAt ?? "—"}</span>
              </li>
            );
          })}
        </ul>
        <div className={styles.row}>
          <button type="button" className={styles.secondary} onClick={() => void refreshHealth()}>
            刷新状态
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy !== null}
            onClick={() => void run("collect", () => collectSocialData(token), "已触发采集")}
          >
            立即采集
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>PlayStation</h2>
        <ol className={styles.steps}>
          <li>
            在<b>已登录 PSN 的浏览器</b>打开{" "}
            <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer">
              ca.account.sony.com/api/v1/ssocookie
            </a>
            ，页面会返回 <code>{'{"npsso":"..."}'}</code>。
          </li>
          <li>把 npsso 的值粘到下面，点绑定。</li>
        </ol>
        <input
          className={styles.input}
          type="password"
          value={npsso}
          placeholder="NPSSO（64 位）"
          onChange={(event) => setNpsso(event.target.value)}
        />
        <div className={styles.row}>
          <button
            type="button"
            className={styles.primary}
            disabled={busy !== null || npsso.trim().length < 32}
            onClick={() => void run("psn", () => linkPsnAccount(npsso, token), "PSN 已绑定，已发起首次采集")}
          >
            {busy === "psn" ? "绑定中…" : "绑定 PSN"}
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Nintendo Switch</h2>
        <ol className={styles.steps}>
          <li>点下面按钮，在新标签页登录任天堂账号。</li>
          <li>登录成功后会跳到 <code>npf54789befb391a838://auth#session_token_code=…</code> 的失败页。</li>
          <li>把地址栏整条 URL 复制回下面的输入框，点完成绑定。</li>
        </ol>
        <div className={styles.row}>
          <button type="button" className={styles.secondary} onClick={() => void startNintendoLogin()}>
            开始任天堂登录
          </button>
        </div>
        <textarea
          className={styles.textarea}
          value={callbackUrl}
          placeholder="粘贴 npf…://auth#session_token_code=…"
          onChange={(event) => setCallbackUrl(event.target.value)}
        />
        <div className={styles.row}>
          <button
            type="button"
            className={styles.primary}
            disabled={busy !== null || !callbackUrl.trim() || !verifier}
            onClick={() => void finishNintendoLogin()}
          >
            {busy === "nintendo" ? "绑定中…" : "完成绑定"}
          </button>
        </div>
      </section>

      {message ? (
        <p className={message.tone === "ok" ? styles.messageOk : styles.messageError}>{message.text}</p>
      ) : null}
    </main>
  );
}
