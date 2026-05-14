"use client";

import { type ReactNode, useEffect, useState } from "react";

import styles from "@/styles/ai-daily.module.css";

const STORAGE_KEY = "mays-ai-daily-authenticated";

type AiDailyPasswordGateProps = {
  passwordHash: string;
  children: ReactNode;
};

export function AiDailyPasswordGate({ passwordHash, children }: AiDailyPasswordGateProps) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setIsAuthenticated(window.localStorage.getItem(STORAGE_KEY) === passwordHash);
    setIsReady(true);
  }, [passwordHash]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const hash = await sha256(password);

    if (hash === passwordHash) {
      window.localStorage.setItem(STORAGE_KEY, passwordHash);
      setIsAuthenticated(true);
      setPassword("");
      return;
    }

    setError("访问口令不正确");
  }

  if (!passwordHash) {
    return (
      <div className={styles.gateShell}>
        <div className={styles.gatePanel}>
          <p className={styles.kicker}>AI Daily</p>
          <h1 className={styles.gateTitle}>频道尚未校准</h1>
          <p className={styles.gateCopy}>
            需要配置 `NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH` 后才能打开日报。
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={styles.gateShell}>
        <div className={styles.gatePanel}>
          <p className={styles.kicker}>AI Daily</p>
          <h1 className={styles.gateTitle}>正在校验信号</h1>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className={styles.gateShell}>
      <form className={styles.gatePanel} onSubmit={handleSubmit}>
        <p className={styles.kicker}>AI Daily</p>
        <h1 className={styles.gateTitle}>输入口令</h1>
        <p className={styles.gateCopy}>这是 MAYS UNIVERSE 的私人 AI 日报频道。</p>
        <label className={styles.passwordLabel} htmlFor="ai-daily-password">
          Access key
        </label>
        <input
          id="ai-daily-password"
          className={styles.passwordInput}
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className={styles.gateError}>{error}</p> : null}
        <button className={styles.primaryButton} type="submit">
          Unlock Daily
        </button>
      </form>
    </div>
  );
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
