"use client";

import { useEffect, useState } from "react";

import { NINTENDO_DEMO_GAMES } from "@/lib/demo-games";

import styles from "@/styles/game/nintendoHome.module.css";

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.4 5h13.2a1.8 1.8 0 0 1 1.8 1.8v8.1a1.8 1.8 0 0 1-1.8 1.8h-6.9L7 19.9v-3.2H5.4a1.8 1.8 0 0 1-1.8-1.8V6.8A1.8 1.8 0 0 1 5.4 5Z" />
      <path d="M9 11.6h6" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5h11v11H6.5A2.5 2.5 0 0 1 4 15V6.5Z" />
      <path d="M15 9.5h4.2v6.2a1.8 1.8 0 0 1-1.8 1.8H15" />
      <path d="M7 9.8h5.5M7 12.4h5.5M7 15h3.5" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.2 8.6h11.6l-1 10.4H7.2L6.2 8.6Z" />
      <path d="M9.4 8.6V7.2a2.6 2.6 0 0 1 5.2 0v1.4" />
    </svg>
  );
}

function AlbumIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2.2" />
      <path d="M4.4 15.6 8.6 11.8l3.4 2.9 2.8-2.4 4.8 4" />
      <circle cx="9.2" cy="9.8" r="1.1" />
    </svg>
  );
}

function ControllerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="8" width="18" height="9" rx="4.4" />
      <path d="M8 11v3M6.5 12.5h3" />
      <circle cx="15.6" cy="11.6" r="0.9" />
      <circle cx="17.8" cy="13.7" r="0.9" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SleepIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.6 4.6a7.6 7.6 0 1 0 3.8 12.8 8.6 8.6 0 0 1-3.8-12.8Z" />
    </svg>
  );
}

function ConsoleGlyph() {
  return (
    <svg viewBox="0 0 64 28" aria-hidden="true" className={styles.consoleGlyph}>
      <rect width="64" height="28" rx="6" fill="#2e2e2e" />
      <rect x="13" y="4" width="38" height="20" fill="#f0f0f0" />
      <circle cx="6" cy="8" r="3" fill="#f0f0f0" />
      <circle cx="58" cy="20" r="3" fill="#f0f0f0" />
      <circle cx="6.5" cy="15.5" r="1.5" fill="#f0f0f0" />
      <circle cx="57.5" cy="6.5" r="1.5" fill="#f0f0f0" />
      <circle cx="3.5" cy="18.5" r="1.5" fill="#f0f0f0" />
      <circle cx="54.5" cy="9.5" r="1.5" fill="#f0f0f0" />
      <circle cx="9.5" cy="18.5" r="1.5" fill="#f0f0f0" />
      <circle cx="60.5" cy="9.5" r="1.5" fill="#f0f0f0" />
      <circle cx="6.5" cy="21.5" r="1.5" fill="#f0f0f0" />
      <circle cx="57.5" cy="12.5" r="1.5" fill="#f0f0f0" />
    </svg>
  );
}

const DOCK_ITEMS = [
  { key: "chat", label: "聊天", color: "#f97316", Icon: ChatIcon },
  { key: "news", label: "新闻", color: "#22c55e", Icon: NewsIcon },
  { key: "shop", label: "Nintendo eShop", color: "#ef4444", Icon: ShopIcon },
  { key: "album", label: "相册", color: "#3b82f6", Icon: AlbumIcon },
  { key: "controllers", label: "手柄", color: "#64748b", Icon: ControllerIcon },
  { key: "settings", label: "设置", color: "#64748b", Icon: SettingsIcon },
  { key: "sleep", label: "休眠", color: "#64748b", Icon: SleepIcon }
] as const;

/**
 * Switch 主界面复刻：游戏图标行 + 底部系统图标栏 + 手柄键位提示。
 * 所有图标只做视觉复刻，不承载真实功能。
 */
export function NintendoHome() {
  const [gameIndex, setGameIndex] = useState(0);
  const total = NINTENDO_DEMO_GAMES.length;
  const activeGame = NINTENDO_DEMO_GAMES[gameIndex];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setGameIndex((index) => (index + 1) % total);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setGameIndex((index) => (index - 1 + total) % total);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [total]);

  return (
    <div className={styles.home}>
      <div className={styles.stage}>
        <div className={styles.shelf} role="group" aria-label="游戏">
          {NINTENDO_DEMO_GAMES.map((game, index) => (
            <button
              key={game.id}
              type="button"
              className={`${styles.tile} ${index === gameIndex ? styles.tileActive : ""}`}
              onClick={() => setGameIndex(index)}
              aria-pressed={index === gameIndex}
              aria-label={game.title}
            >
              {/* 演示封面为本地静态图，尺寸由 CSS 控制 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.cover} alt="" draggable={false} />
            </button>
          ))}
        </div>
      </div>

      <div className={styles.dock} role="group" aria-label="系统菜单">
          {DOCK_ITEMS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className={styles.dockItem}
              style={{ color: entry.color }}
              aria-label={entry.label}
            >
              <entry.Icon />
              <span className={styles.dockLabel}>{entry.label}</span>
            </button>
        ))}
      </div>

      {activeGame ? (
        <div className={styles.info}>
          <span className={styles.infoCover}>
            {/* 演示封面为本地静态图，尺寸由 CSS 控制 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeGame.cover} alt="" draggable={false} />
          </span>
          <span className={styles.infoText}>
            <span className={styles.infoTitle}>{activeGame.title}</span>
            <span className={styles.infoHint}>
              <span className={`${styles.keycap} ${styles.keycapSmall}`}>A</span>
              启动
            </span>
          </span>
        </div>
      ) : null}

      <footer className={styles.footer}>
        <ConsoleGlyph />
        <div className={styles.controls}>
          <span className={styles.control}>
            <span className={styles.keycap}>+</span>
            选项
          </span>
          <span className={styles.control}>
            <span className={styles.keycap}>A</span>
            确定
          </span>
        </div>
      </footer>
    </div>
  );
}