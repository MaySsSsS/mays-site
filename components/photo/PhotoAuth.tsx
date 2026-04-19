"use client";

import { FormEvent, useState } from "react";

import { useAuthStore } from "@/stores/auth-store";

import styles from "@/styles/photo/PhotoAuth.module.css";

export function PhotoAuth({
  onSuccess
}: Readonly<{
  onSuccess: () => void;
}>) {
  const login = useAuthStore((state) => state.login);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password || loading) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const success = await login(password);
    if (success) {
      onSuccess();
      setPassword("");
    } else {
      setErrorMessage("密码错误或网络异常，请重试。");
      setPassword("");
    }

    setLoading(false);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>PRIVATE ALBUM</p>
        <h2 className={styles.title}>私密相册入口</h2>
        <p className={styles.description}>输入访问密码后，照片分组和地图数据会从 Worker 同步。</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.inputWrap}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码..."
              className={styles.input}
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? "隐藏" : "显示"}
            </button>
          </label>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

          <button type="submit" className={styles.submit} disabled={loading || !password}>
            {loading ? "验证中..." : "进入相册"}
          </button>
        </form>
      </div>
    </div>
  );
}
