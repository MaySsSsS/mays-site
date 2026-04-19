"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "@/styles/photo/PhotoShell.module.css";

export function PhotoShell({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/photos" className={styles.logo}>
            <span className={styles.logoMark}>◌</span>
            <span className={styles.logoText}>Mays Photos</span>
          </Link>

          <nav className={styles.nav}>
            <Link
              href="/photos"
              className={`${styles.navLink} ${
                pathname === "/photos" ? styles.navLinkActive : ""
              }`}
            >
              照片 · 足迹
            </Link>
            <Link href="/game" className={styles.navLink}>
              Game
            </Link>
            <Link href="/" className={styles.navLink}>
              Portal
            </Link>
          </nav>

          <button
            type="button"
            className={styles.mobileButton}
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className={styles.mobileMenu}>
            <Link href="/photos" className={styles.mobileLink}>
              照片 · 足迹
            </Link>
            <Link href="/game" className={styles.mobileLink}>
              返回 Game
            </Link>
            <Link href="/" className={styles.mobileLink}>
              返回 Portal
            </Link>
          </div>
        ) : null}
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <p className={styles.footerTitle}>Mays Photos</p>
            <p className={styles.footerText}>
              用地图记录旅行，用照片把分组和城市重新串起来。
            </p>
          </div>
          <Link href="/game" className={styles.footerLink}>
            打开 Game 仪表盘
          </Link>
        </div>
      </footer>
    </div>
  );
}
