"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PlatformAvatar } from "./PlatformAvatar";
import styles from "@/styles/game/nintendoShell.module.css";

const links = [{ href: "/games/nintendoswitch", label: "主页" }];

export function NintendoShell({ children }: Readonly<{ children: React.ReactNode }>) {
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
          <PlatformAvatar platform="nintendoswitch" name="Mays" subtitle="NINTENDO SWITCH" />

          <div className={styles.topRight}>
            <time className={styles.clock} dateTime={currentTime}>
              {currentTime}
            </time>
            <Link href="/games" className={styles.iconLink} aria-label="返回平台传送门" title="返回传送门">
              ◱
            </Link>
            <Link href="/" className={styles.iconLink} aria-label="返回主站" title="返回主站">
              ⌂
            </Link>
          </div>
        </div>
      </header>

      <nav className={styles.nav} aria-label="Switch 站内导航">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ""}`}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
        <span className={styles.navHint}>演示数据 · 未接入 Nintendo 账号</span>
      </nav>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <span>NINTENDO SUBSITE / linkmays.com</span>
        <span className={styles.footerHint}>SWITCH 2 UI STUDY</span>
      </footer>
    </div>
  );
}