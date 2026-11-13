/**
 * Steam 等级换算：沿用 Steam 官方的每 10 级一档的 XP 规则。
 * 1-10 级每级 100 XP，11-20 级每级 200 XP，21-30 级每级 300 XP，以此类推。
 * 这里把「拥有游戏数」与「总游玩时长」折算成 XP，用于展示个人资料页的等级环。
 */

export interface SteamLevelState {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
  totalXp: number;
}

export interface SteamLevelStyle {
  color: string;
  glow: string;
  name: string;
}

const XP_PER_GAME = 100;

export function getXpRequiredForLevel(level: number): number {
  const bracket = Math.floor((level - 1) / 10) + 1;
  return bracket * 100;
}

export function calculateSteamProfileXp(gameCount: number, totalPlaytimeMinutes: number): number {
  const hours = Math.floor(totalPlaytimeMinutes / 60);
  return gameCount * XP_PER_GAME + Math.floor(hours / 10);
}

export function calculateLevelFromXp(totalXp: number): SteamLevelState {
  let level = 1;
  let remaining = Math.max(totalXp, 0);

  while (remaining >= getXpRequiredForLevel(level) && level < 999) {
    remaining -= getXpRequiredForLevel(level);
    level += 1;
  }

  const nextLevelXp = getXpRequiredForLevel(level);

  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp,
    progress: nextLevelXp > 0 ? Math.min(remaining / nextLevelXp, 1) : 0,
    totalXp
  };
}

export function getLevelStyle(level: number): SteamLevelStyle {
  if (level < 5) {
    return { color: "#8b8b8b", glow: "rgba(139, 139, 139, 0.45)", name: "新手" };
  }

  if (level < 10) {
    return { color: "#4a90e2", glow: "rgba(74, 144, 226, 0.5)", name: "入门" };
  }

  if (level < 20) {
    return { color: "#3ba9d6", glow: "rgba(59, 169, 214, 0.5)", name: "常客" };
  }

  if (level < 30) {
    return { color: "#4caf93", glow: "rgba(76, 175, 147, 0.5)", name: "老玩家" };
  }

  if (level < 50) {
    return { color: "#b786e0", glow: "rgba(183, 134, 224, 0.55)", name: "资深玩家" };
  }

  return { color: "#e0b64a", glow: "rgba(224, 182, 74, 0.6)", name: "骨灰级玩家" };
}