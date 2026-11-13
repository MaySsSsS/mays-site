"use client";

import { useEffect, useState } from "react";

import { PlatformAvatar } from "./PlatformAvatar";
import styles from "@/styles/game/nintendoShell.module.css";

export function NintendoShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [currentTime, setCurrentTime] = useState("");

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
    const intervalId = window.setInterval(updateTime, 15_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <PlatformAvatar
          platform="nintendoswitch"
          name="Mays"
          subtitle="NINTENDO SWITCH"
          variant="compact"
        />

        <div className={styles.status}>
          <svg className={styles.statusIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 17.6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor" stroke="none" />
            <path
              d="M7.4 12.6a6.6 6.6 0 0 1 9.2 0M4.6 9.8a10.6 10.6 0 0 1 14.8 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          <svg className={styles.batteryIcon} viewBox="0 0 27 14" aria-hidden="true">
            <rect x="1" y="1" width="21" height="12" rx="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3.2" y="3.2" width="15" height="7.6" rx="1.8" fill="currentColor" />
            <rect x="23.4" y="4.4" width="2.4" height="5.2" rx="1.2" fill="currentColor" />
          </svg>

          <time className={styles.clock}>{currentTime}</time>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}