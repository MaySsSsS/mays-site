"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { SteamPlayerSummary } from "@/types/steam";

import { PlatformAvatar } from "./PlatformAvatar";

import styles from "@/styles/game/steamShell.module.css";

const links = [
  { href: "/games/steam", label: "概览" },
  { href: "/games/steam/library", label: "游戏库" }
];

export function SteamShell({
  player,
  children
}: Readonly<{
  player?: SteamPlayerSummary | null;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState("--:--");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        })
      );
    };

    updateTime();
    const intervalId = window.setInterval(updateTime, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <PlatformAvatar
            platform="steam"
            name={player?.personaname ?? "Steam"}
            avatarUrl={player?.avatarfull}
            subtitle={currentTime}
          />

          <nav className={styles.nav} aria-label="Steam 页面导航">
            {links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <Link href="/games" className={styles.backLink}>
            <span aria-hidden="true">←</span> 传送门
          </Link>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.statusBar}>
        <div className={styles.statusBarInner}>
          <span className={styles.statusOnline}>
            <span className={styles.statusDot} aria-hidden="true" />
            STEAM ONLINE
          </span>
          <span className={styles.statusMuted}>linkmays.com/games/steam</span>
          <span className={styles.statusSpacer} />
          <span className={styles.statusMuted}>{currentTime}</span>
        </div>
      </footer>
    </div>
  );
}