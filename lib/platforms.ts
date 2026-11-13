export type PlatformKey = "steam" | "nintendoswitch" | "playstation";

export interface PlatformEntry {
  key: PlatformKey;
  eyebrow: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  route: string;
  accent: string;
  badge: string;
}

export const PLATFORMS: readonly PlatformEntry[] = [
  {
    key: "steam",
    eyebrow: "STEAM",
    name: "Steam 游戏库",
    tagline: "STEAM DECK / 真实数据",
    description:
      "142 款游戏的真实游玩时长、最近游玩与最常打开的作品，直接读取 Steam 快照。",
    href: "/games/steam",
    route: "linkmays.com/games/steam",
    accent: "#66c0f4",
    badge: "真实数据"
  },
  {
    key: "nintendoswitch",
    eyebrow: "NINTENDO",
    name: "Nintendo Switch",
    tagline: "SWITCH 2 / 演示数据",
    description:
      "Switch 2 主界面风格的游戏墙，拖动浏览方块封面，空槽位保留系统占位样式。",
    href: "/games/nintendoswitch",
    route: "linkmays.com/games/nintendoswitch",
    accent: "#e60012",
    badge: "演示数据"
  },
  {
    key: "playstation",
    eyebrow: "PLAYSTATION",
    name: "PlayStation 5",
    tagline: "PS5 / 演示数据",
    description:
      "PS5 主界面的媒体栏与背景联动，选中游戏时整页背景跟着封面配色变化。",
    href: "/games/playstation",
    route: "linkmays.com/games/playstation",
    accent: "#2f6bff",
    badge: "演示数据"
  }
];

export function getPlatform(key: PlatformKey): PlatformEntry {
  const platform = PLATFORMS.find((entry) => entry.key === key);

  if (!platform) {
    throw new Error(`Unknown platform: ${key}`);
  }

  return platform;
}