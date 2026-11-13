"use client";

import { useEffect, useState } from "react";

import { NINTENDO_DEMO_GAMES } from "@/lib/demo-games";

import styles from "@/styles/game/nintendoHome.module.css";

/**
 * 参考项目的 Home 图标是「红底圆 + Switch Online 图」，
 * 这里用本地静态图复刻，避免依赖外部图片。
 */
function HomeGlyph() {
  return (
    <span className={styles.homeCircle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/games/nintendo/switch-online.avif" alt="" draggable={false} />
    </span>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 11.6a8.4 8.4 0 0 1-8.4 8.4 9 9 0 0 1-3.1-.6L4 21l1.7-4.6a8.4 8.4 0 1 1 15.3-4.8Z" />
      <circle cx="8.9" cy="11.6" r="0.9" />
      <circle cx="12" cy="11.6" r="0.9" />
      <circle cx="15.1" cy="11.6" r="0.9" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3H6.6A1.6 1.6 0 0 0 5 4.6v14.8A1.6 1.6 0 0 0 6.6 21H17a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M8.6 12.6h6.4M8.6 16.2h6.4M8.6 9h2.6" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.8 8h12.4l-1 11.2a1.6 1.6 0 0 1-1.6 1.4H8.4a1.6 1.6 0 0 1-1.6-1.4L5.8 8Z" />
      <path d="M9 8V6.4a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

function AlbumIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4" />
      <circle cx="8.6" cy="9.4" r="1.5" />
      <path d="M4 17.4 9.4 12l3.6 3.2 3-2.6 4.6 4.8" />
    </svg>
  );
}

function CableIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5v3.4a3 3 0 0 0 3 3h8a3 3 0 0 1 3 3V19" />
      <rect x="3.4" y="2.6" width="3.2" height="3.2" rx="0.8" />
      <rect x="17.4" y="18.2" width="3.2" height="3.2" rx="0.8" />
    </svg>
  );
}

function ControllerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.6 8h8.8a4.6 4.6 0 0 1 4.6 4.6c0 2.4-1.4 4.4-4 4.4-1.5 0-2.2-.8-3.6-.8h-2.8c-1.4 0-2.1.8-3.6.8-2.6 0-4-2-4-4.4A4.6 4.6 0 0 1 7.6 8Z" />
      <path d="M7.4 11.2v3M5.9 12.7h3" />
      <circle cx="15.6" cy="11.6" r="0.9" />
      <circle cx="18" cy="13.8" r="0.9" />
    </svg>
  );
}

function CartridgeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3.4" width="14" height="17.2" rx="2" />
      <path d="M9.4 7h5.2M9.4 10.4h5.2" />
      <path d="M8.4 17.2v1.4M12 17.2v1.4M15.6 17.2v1.4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.6v2.6M12 18.8v2.6M3.9 5.9l1.9 1.9M18.2 16.2l1.9 1.9M2.6 12h2.6M18.8 12h2.6M3.9 18.1l1.9-1.9M18.2 7.8l1.9-1.9" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v8.4" />
      <path d="M17.6 6.2a7.4 7.4 0 1 1-11.2 0" />
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
  { key: "chat", label: "Chat", color: "#f97316", Icon: ChatIcon },
  { key: "news", label: "News", color: "#22c55e", Icon: NewsIcon },
  { key: "eshop", label: "Nintendo eShop", color: "#ef4444", Icon: ShopIcon },
  { key: "screenshots", label: "Screenshots", color: "#3b82f6", Icon: AlbumIcon },
  { key: "connections", label: "Connections", color: "#06b6d4", Icon: CableIcon },
  { key: "controllers", label: "Controllers", color: "#4a5459", Icon: ControllerIcon },
  { key: "cartridges", label: "Cartridges", color: "#4a5459", Icon: CartridgeIcon },
  { key: "settings", label: "System Settings", color: "#4a5459", Icon: SettingsIcon },
  { key: "power", label: "Sleep Mode", color: "#4a5459", Icon: PowerIcon }
] as const;

/**
 * Switch 主界面复刻：游戏行 + 底部系统图标栏 + 主机图标与键位提示。
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

      <nav className={styles.dock} aria-label="系统菜单">
        <button type="button" className={`${styles.dockItem} ${styles.dockHome}`} aria-label="Home">
          <HomeGlyph />
          <span className={styles.dockLabel}>Home</span>
        </button>

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
      </nav>

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
              <span className={styles.keycap}>A</span>
              Start
            </span>
          </span>
        </div>
      ) : null}

      <footer className={styles.footer}>
        <ConsoleGlyph />
        <div className={styles.controls}>
          <span className={styles.control}>
            <span className={styles.keycap}>+</span>
            Options
          </span>
          <span className={styles.control}>
            <span className={styles.keycap}>A</span>
            OK
          </span>
        </div>
      </footer>
    </div>
  );
}