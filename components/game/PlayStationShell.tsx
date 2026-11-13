"use client";

import { useEffect, useState } from "react";

import { PlatformAvatar } from "./PlatformAvatar";
import styles from "@/styles/game/playstationShell.module.css";

export function PlayStationShell({ children }: Readonly<{ children: React.ReactNode }>) {
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
        <time className={styles.clock}>{currentTime}</time>
        <PlatformAvatar
          platform="playstation"
          name="Mays"
          subtitle="PLAYSTATION 5"
          variant="compact"
          align="end"
        />
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}