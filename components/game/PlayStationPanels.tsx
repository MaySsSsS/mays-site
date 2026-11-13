"use client";

import { useState } from "react";

import {
  PLAYSTATION_DEMO_CHAT,
  PLAYSTATION_DEMO_FRIENDS,
  PLAYSTATION_DEMO_PROFILE,
  type PlayStationDemoFriend,
  type PlayStationDemoMessage
} from "@/lib/demo-games";

import styles from "@/styles/game/playstationHome.module.css";

const AVATAR_TINTS = ["#3a4a6b", "#2a4a3a", "#4a3a6b", "#4a3a2a"];

function FriendsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="10" r="2.4" fill="currentColor" />
      <path
        d="M5.5 17.2c.5-1.9 2-2.8 3.5-2.8s3 .9 3.5 2.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function PartyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14c1.1 1.2 2.4 1.8 4 1.8s2.9-.6 4-1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FriendAvatar({ friend, tint }: { friend: PlayStationDemoFriend; tint: string }) {
  return (
    <span className={styles.avatar} style={{ background: tint }}>
      {friend.name.slice(0, 1)}
      <span
        className={`${styles.avatarDot} ${friend.status === "in-game" ? styles.avatarDotPlaying : ""}`}
        aria-hidden="true"
      />
    </span>
  );
}

export function FriendsPanel() {
  const friends = PLAYSTATION_DEMO_FRIENDS;
  const online = friends.filter((friend) => friend.status === "online" || friend.status === "in-game");

  return (
    <section className={styles.panel} aria-label="好友">
      <header className={styles.panelHead}>
        <span className={styles.panelIcon}>
          <FriendsIcon />
        </span>
        <span className={styles.panelTitle}>好友</span>
        <span className={styles.onlinePill}>{online.length} 在线</span>
      </header>

      <div className={styles.friendList}>
        {online.slice(0, 3).map((friend, index) => (
          <div key={friend.id} className={styles.friendRow}>
            <FriendAvatar friend={friend} tint={AVATAR_TINTS[index % AVATAR_TINTS.length] ?? "#3a4a6b"} />
            <span className={styles.friendMeta}>
              <span className={styles.friendName}>{friend.name}</span>
              <span className={friend.game ? styles.friendGame : styles.friendOnline}>
                {friend.game ?? "在线"}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TrophyPanel() {
  const profile = PLAYSTATION_DEMO_PROFILE;
  const percent = Math.round((profile.levelXp / profile.nextLevelXp) * 100);
  const trophyCells = [
    { key: "bronze", color: "#cd7f32", count: profile.trophies.bronze },
    { key: "silver", color: "#c0c0c0", count: profile.trophies.silver },
    { key: "gold", color: "#ffd700", count: profile.trophies.gold }
  ];

  return (
    <section className={styles.panel} aria-label="等级与奖杯">
      <header className={styles.panelHead}>
        <span className={styles.panelIcon}>
          <TrophyIcon />
        </span>
        <span className={styles.panelTitle}>等级与奖杯</span>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCell}>
          <span className={styles.statLabel}>等级进度</span>
          <span className={styles.statValue}>{percent}%</span>
          <span className={styles.statBar}>
            <span className={styles.statBarFill} style={{ width: `${percent}%` }} />
          </span>
          <span className={styles.statHint}>
            Lv {profile.level} → {profile.nextLevel}
          </span>
        </div>

        <div className={styles.statCell}>
          <span className={styles.statLabel}>奖杯</span>
          <span className={styles.statValue}>
            {profile.trophies.bronze + profile.trophies.silver + profile.trophies.gold}
          </span>
          <span className={styles.trophyRow}>
            {trophyCells.map((cell) => (
              <span key={cell.key} className={styles.trophyItem}>
                <span className={styles.trophyDot} style={{ background: cell.color }} />
                <span className={styles.trophyCount}>{cell.count}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}

export function PartyPanel() {
  const [messages, setMessages] = useState<readonly PlayStationDemoMessage[]>(PLAYSTATION_DEMO_CHAT);
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: `local-${current.length + 1}`, author: "我", text, self: true }
    ]);
    setDraft("");
  };

  return (
    <section className={`${styles.panel} ${styles.partyPanel}`} aria-label="派对">
      <header className={styles.panelHead}>
        <span className={styles.panelIcon}>
          <PartyIcon />
        </span>
        <span className={styles.panelTitle}>派对</span>
      </header>

      <div className={styles.partyAvatars}>
        {PLAYSTATION_DEMO_FRIENDS.slice(0, 4).map((friend, index) => (
          <span
            key={friend.id}
            className={styles.partyAvatar}
            style={{ background: AVATAR_TINTS[index % AVATAR_TINTS.length] ?? "#3a4a6b" }}
          >
            {friend.name.slice(0, 1)}
          </span>
        ))}
      </div>

      <div className={styles.chatList}>
        {messages.slice(-4).map((message) => (
          <div
            key={message.id}
            className={`${styles.chatRow} ${message.self ? styles.chatRowSelf : ""}`}
          >
            {message.self ? null : <span className={styles.chatAuthor}>{message.author}</span>}
            <span className={`${styles.chatBubble} ${message.self ? styles.chatBubbleSelf : ""}`}>
              {message.text}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.chatInputRow}>
        <input
          className={styles.chatInput}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              send();
            }
          }}
          placeholder="发送消息"
          aria-label="发送消息"
        />
        <button type="button" className={styles.chatSend} onClick={send} aria-label="发送">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 4L21 20H3L12 4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}