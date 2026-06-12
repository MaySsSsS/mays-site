import type { SignalArenaRank as RankData } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaRankProps = {
  rank: RankData;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatGap(value: number | null, label: string): string {
  return value === null ? `${label}待同步` : `${label}${formatMoney(value)}`;
}

export function SignalArenaRank({ rank }: SignalArenaRankProps) {
  return (
    <section className={styles.rankPage}>
      <div className={styles.rankHero}>
        <span className={styles.rankHeroLabel}>当前排名</span>
        <strong className={styles.rankHeroValue}>{rank.currentRank ?? "未同步"}</strong>
        <em className={styles.rankHeroMeta}>收益率 {formatRate(rank.returnRate)}</em>
        <p className={styles.rankHeroNote}>{formatGap(rank.previousGap, "距前一名 ")}</p>
        <p className={styles.rankHeroNote}>{formatGap(rank.topTenGap, "距前 10 ")}</p>
        <p className={styles.rankHeroNote}>{formatGap(rank.leaderGap, "距榜首 ")}</p>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>排行榜前列</h2>
          <p className={styles.sectionNote}>显示公开榜单中的领先账户。</p>
        </div>

        {rank.leaders.length === 0 ? (
          <p className={styles.empty}>暂无排行榜数据。</p>
        ) : (
          <div className={styles.rankList}>
            {rank.leaders.map((entry, index) => (
              <div
                key={`${entry.rank}-${entry.nickname}-${index}`}
                className={entry.isCurrentAgent ? styles.rankCurrent : styles.rankRow}
              >
                <span>#{entry.rank}</span>
                <strong>{entry.nickname}</strong>
                <span>{formatMoney(entry.totalAssets)}</span>
                <span>{formatRate(entry.returnRate)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>附近对手</h2>
          <p className={styles.sectionNote}>围绕当前账户位置展示相邻竞争者。</p>
        </div>

        {rank.nearby.length === 0 ? (
          <p className={styles.empty}>暂无附近排名数据。</p>
        ) : (
          <div className={styles.rankList}>
            {rank.nearby.map((entry, index) => (
              <div
                key={`${entry.rank}-${entry.nickname}-${index}`}
                className={entry.isCurrentAgent ? styles.rankCurrent : styles.rankRow}
              >
                <span>#{entry.rank}</span>
                <strong>{entry.nickname}</strong>
                <span>{formatMoney(entry.totalAssets)}</span>
                <span>{formatRate(entry.returnRate)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
