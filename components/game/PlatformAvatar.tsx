"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PLATFORMS, type PlatformKey } from "@/lib/platforms";

import styles from "@/styles/game/avatar.module.css";

const skinClass: Record<PlatformKey, string> = {
  steam: styles.skinSteam,
  nintendoswitch: styles.skinNintendo,
  playstation: styles.skinPlaystation
};

export function PlatformAvatar({
  platform,
  name,
  avatarUrl,
  subtitle,
  variant = "full",
  align = "start"
}: Readonly<{
  platform: PlatformKey;
  name: string;
  avatarUrl?: string | null;
  subtitle: string;
  variant?: "full" | "compact";
  align?: "start" | "end";
}>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "M";
  const compact = variant === "compact";

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`${styles.root} ${skinClass[platform]}`} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${compact ? styles.triggerCompact : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${name} 的账号与平台切换菜单`}
      >
        <span className={styles.avatarFrame}>
          {avatarUrl ? (
            // Steam 头像为远程地址，无需 next/image 的尺寸与域名配置
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className={styles.avatar} />
          ) : (
            <span className={styles.monogram} aria-hidden="true">
              {initial}
            </span>
          )}
          <span className={styles.presence} aria-hidden="true" />
        </span>

        {compact ? null : (
          <>
            <span className={styles.identity}>
              <span className={styles.name}>{name}</span>
              <span className={styles.subtitle}>{subtitle}</span>
            </span>
            <span className={`${styles.caret} ${open ? styles.caretOpen : ""}`} aria-hidden="true">
              ▾
            </span>
          </>
        )}
      </button>

      {open ? (
        <div
          className={`${styles.menu} ${align === "end" ? styles.menuEnd : ""}`}
          role="menu"
          aria-label="切换平台"
        >
          <p className={styles.menuHint}>切换平台</p>
          {PLATFORMS.map((entry) =>
            entry.key === platform ? (
              <span key={entry.key} className={`${styles.menuItem} ${styles.menuItemActive}`} aria-current="page">
                <span className={styles.menuDot} style={{ background: entry.accent }} aria-hidden="true" />
                <span className={styles.menuText}>
                  <span className={styles.menuName}>{entry.name}</span>
                  <span className={styles.menuMeta}>{entry.tagline}</span>
                </span>
                <span className={styles.menuCurrent}>当前</span>
              </span>
            ) : (
              <Link
                key={entry.key}
                href={entry.href}
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className={styles.menuDot} style={{ background: entry.accent }} aria-hidden="true" />
                <span className={styles.menuText}>
                  <span className={styles.menuName}>{entry.name}</span>
                  <span className={styles.menuMeta}>{entry.tagline}</span>
                </span>
                <span className={styles.menuEnter} aria-hidden="true">
                  →
                </span>
              </Link>
            )
          )}

          <div className={styles.menuFooter}>
            <Link href="/games" className={styles.menuFooterLink} onClick={() => setOpen(false)}>
              返回传送门
            </Link>
            <Link href="/" className={styles.menuFooterLink} onClick={() => setOpen(false)}>
              返回主站
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}