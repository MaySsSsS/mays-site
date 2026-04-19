"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "@/styles/game/GameShell.module.css";

const links = [
  { href: "/game", label: "HOME" },
  { href: "/games", label: "LIBRARY" },
  { href: "/photos", label: "PHOTOS" },
  { href: "/", label: "PORTAL" }
];

export function GameShell({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("--:--:--");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-GB", {
          hour12: false
        })
      );
    };

    updateTime();
    const intervalId = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <Link href="/game" className={styles.logo}>
            <span className={styles.logoPrompt}>&gt;</span>
            <span className={styles.logoText}>MAYS://NEXT</span>
            <span className={styles.statusDot} />
          </Link>

          <nav className={styles.navLinks}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${
                  pathname === link.href ? styles.navLinkActive : ""
                }`}
              >
                <span className={styles.navArrow}>▶</span>
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className={styles.mobileMenu}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.mobileLink} ${
                  pathname === link.href ? styles.mobileLinkActive : ""
                }`}
              >
                <span className={styles.navArrow}>▶</span>
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.statusBar}>
        <div className={styles.statusBarInner}>
          <span className={styles.statusItem}>
            <span className={styles.statusDot} />
            NEXT:ONLINE
          </span>
          <span className={styles.statusDivider}>|</span>
          <span className={styles.statusMuted}>APP_ROUTER</span>
          <span className={styles.statusDivider}>|</span>
          <span className={styles.statusMuted}>{currentTime}</span>
          <span className={styles.statusSpacer} />
          <span className={styles.statusMuted}>GAME SUBSITE PRESERVED IN NEXT</span>
        </div>
      </footer>
    </div>
  );
}
