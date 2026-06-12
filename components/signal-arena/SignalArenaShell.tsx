import Link from "next/link";

import styles from "@/styles/signal-arena.module.css";

type SignalArenaShellProps = {
  active: "dashboard" | "logs" | "rank";
  updatedAt: string | null;
  children: React.JSX.Element;
};

const navItems = [
  { id: "dashboard", label: "总览", href: "/signal-arena" },
  { id: "logs", label: "决策日志", href: "/signal-arena/logs" },
  { id: "rank", label: "竞技排名", href: "/signal-arena/rank" }
] as const;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

export function SignalArenaShell({
  active,
  updatedAt,
  children
}: SignalArenaShellProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>SIGNAL ARENA</p>
          <h1 className={styles.title}>AI Trader Runner</h1>
          <p className={styles.description}>公开只读看板，展示策略状态、决策轨迹与当前竞技位置。</p>
        </div>
        <div className={styles.headerMeta}>
          <Link href="/" className={styles.homeLink} aria-label="返回首页">
            <span aria-hidden="true">←</span>
            <span>返回首页</span>
          </Link>
          <p className={styles.updated}>
            {updatedAt ? `最后更新 ${formatDateTime(updatedAt)}` : "正在同步实时数据"}
          </p>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Signal Arena navigation">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={item.id === active ? styles.tabActive : styles.tab}
            aria-current={item.id === active ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.content}>{children}</div>
    </main>
  );
}
