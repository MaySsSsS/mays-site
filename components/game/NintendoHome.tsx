"use client";

import { useEffect, useState } from "react";

import { NINTENDO_DEMO_GAMES } from "@/lib/demo-games";

import styles from "@/styles/game/nintendoHome.module.css";

type Zone = "games" | "system";

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

const SYSTEM_ICONS = [
  { key: "news", label: "新闻", Icon: NewsIcon },
  { key: "shop", label: "商店", Icon: ShopIcon },
  { key: "album", label: "相册", Icon: AlbumIcon },
  { key: "controllers", label: "手柄", Icon: ControllerIcon },
  { key: "settings", label: "设置", Icon: SettingsIcon },
  { key: "sleep", label: "休眠", Icon: SleepIcon }
] as const;

export function NintendoHome() {
  const [zone, setZone] = useState<Zone>("games");
  const [gameIndex, setGameIndex] = useState(0);
  const [iconIndex, setIconIndex] = useState(0);

  const total = NINTENDO_DEMO_GAMES.length;

  useEffect(() => {
    if (total === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        setZone("system");
        return;
      }

      if (event.key === "ArrowUp") {
        setZone("games");
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      const step = event.key === "ArrowRight" ? 1 : -1;

      if (zone === "games") {
        setGameIndex((index) => (index + step + total) % total);
        return;
      }

      setIconIndex((index) => (index + step + SYSTEM_ICONS.length) % SYSTEM_ICONS.length);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [total, zone]);

  return (
    <div className={styles.home}>
      <div className={styles.shelf} role="group" aria-label="游戏">
        {NINTENDO_DEMO_GAMES.map((game, index) => {
          const active = index === gameIndex;

          return (
            <button
              key={game.id}
              type="button"
              className={`${styles.tile} ${active ? styles.tileActive : ""}`}
              onClick={() => {
                setGameIndex(index);
                setZone("games");
              }}
              aria-pressed={active}
              aria-label={game.title}
            >
              {/* 演示封面为本地静态图，尺寸固定，无需 next/image 优化 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.cover} alt="" className={styles.art} draggable={false} />
            </button>
          );
        })}
      </div>

      <div className={styles.systemRow} role="group" aria-label="系统功能">
        {SYSTEM_ICONS.map((entry, index) => {
          const focused = zone === "system" && index === iconIndex;

          return (
            <button
              key={entry.key}
              type="button"
              className={`${styles.systemIcon} ${focused ? styles.systemIconFocused : ""}`}
              onClick={() => {
                setIconIndex(index);
                setZone("system");
              }}
              aria-label={entry.label}
              title={entry.label}
            >
              <entry.Icon />
            </button>
          );
        })}
      </div>
    </div>
  );
}