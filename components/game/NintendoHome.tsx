"use client";

import { useRef, useState } from "react";

import { NINTENDO_DEMO_GAMES } from "@/lib/demo-games";

import styles from "@/styles/game/nintendoHome.module.css";

const SLOT_COUNT = 6;

export function NintendoHome() {
  const [selectedId, setSelectedId] = useState<string | null>(
    NINTENDO_DEMO_GAMES[0]?.id ?? null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const selected = NINTENDO_DEMO_GAMES.find((game) => game.id === selectedId) ?? null;
  const emptySlots = Math.max(SLOT_COUNT - NINTENDO_DEMO_GAMES.length, 0);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;

    if (!track || event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    dragRef.current = {
      active: true,
      startX: event.clientX,
      startLeft: track.scrollLeft,
      moved: false
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const drag = dragRef.current;

    if (!track || !drag.active) {
      return;
    }

    const delta = event.clientX - drag.startX;

    if (Math.abs(delta) > 4) {
      drag.moved = true;
    }

    track.scrollLeft = drag.startLeft - delta;
  };

  const endDrag = () => {
    dragRef.current.active = false;
  };

  const handleSelect = (id: string) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }

    setSelectedId(id);
    setNotice(null);
  };

  const showNotice = (message: string) => {
    setNotice(message);
  };

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>NINTENDO SWITCH 2</p>
          <h1 className={styles.title}>Mays 的游戏墙</h1>
          <p className={styles.lead}>
            方块封面、拖动浏览、空槽位保留系统占位的交互练习。当前为演示数据，尚未接入 Nintendo 账号。
          </p>
        </div>
        <div className={styles.introMeta}>
          <span className={styles.chip}>演示数据</span>
          <span className={styles.count}>{NINTENDO_DEMO_GAMES.length} / {SLOT_COUNT} 个槽位</span>
        </div>
      </header>

      <section className={styles.shelf} aria-label="游戏墙">
        <div
          className={styles.track}
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
        >
          {NINTENDO_DEMO_GAMES.map((game) => {
            const active = game.id === selectedId;

            return (
              <button
                key={game.id}
                type="button"
                className={`${styles.tile} ${active ? styles.tileActive : ""}`}
                onClick={() => handleSelect(game.id)}
                aria-pressed={active}
              >
                {/* 演示封面为本地静态图，尺寸固定，无需 next/image 优化 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={game.cover} alt={game.title} className={styles.cover} draggable={false} />
                <span className={styles.tileLabel}>{game.title}</span>
                {active ? <span className={styles.tileBadge}>已选择</span> : null}
              </button>
            );
          })}

          {Array.from({ length: emptySlots }).map((_, index) => (
            <div key={`empty-${index}`} className={styles.emptySlot} aria-hidden="true">
              <span className={styles.emptyMark}>+</span>
              <span className={styles.emptyLabel}>空槽位</span>
            </div>
          ))}
        </div>
        <p className={styles.hint}>按住拖动浏览 · 单击选中 · 空槽位为系统占位样式</p>
      </section>

      <section className={styles.systemStrip} aria-label="系统信息（演示数据）">
        <div className={styles.systemItem}>
          <span className={styles.systemLabel}>系统版本</span>
          <span className={styles.systemValue}>2.0.0</span>
        </div>
        <div className={styles.systemItem}>
          <span className={styles.systemLabel}>剩余空间</span>
          <span className={styles.systemValue}>412 GB</span>
        </div>
        <div className={styles.systemItem}>
          <span className={styles.systemLabel}>累计时长</span>
          <span className={styles.systemValue}>60 小时</span>
        </div>
        <div className={styles.systemItem}>
          <span className={styles.systemLabel}>数据状态</span>
          <span className={styles.systemValue}>演示快照</span>
        </div>
      </section>

      <section className={styles.detail} aria-live="polite">
        {selected ? (
          <>
            <div className={styles.detailHead}>
              <span className={styles.detailLabel}>已选中</span>
              <h2 className={styles.detailTitle}>{selected.title}</h2>
              <span className={styles.detailGenre}>{selected.genre}</span>
            </div>
            <dl className={styles.detailStats}>
              <div>
                <dt>游戏时长</dt>
                <dd>{selected.playtime}</dd>
              </div>
              <div>
                <dt>最近游玩</dt>
                <dd>{selected.lastPlayed}</dd>
              </div>
              <div>
                <dt>数据来源</dt>
                <dd>演示快照</dd>
              </div>
            </dl>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => showNotice("演示数据：尚未接入 Nintendo 账号，无法真正启动游戏。")}
              >
                启动游戏
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => showNotice("演示数据：详情页与游玩记录接入后开放。")}
              >
                查看详情
              </button>
            </div>
            {notice ? <p className={styles.notice}>{notice}</p> : null}
          </>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>还没有游戏</p>
            <p className={styles.emptyText}>
              接入 Nintendo 账号后，这里会显示真实封面、游玩时长与最近游玩记录。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}