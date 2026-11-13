export interface NintendoDemoGame {
  id: string;
  title: string;
  cover: string;
}

/**
 * Switch 主界面演示数据：只保留方形封面与名称。
 * 图片为参考项目的本地静态图（见 public/games/nintendo），接入真实账号后替换。
 */
export const NINTENDO_DEMO_GAMES: readonly NintendoDemoGame[] = [
  {
    id: "super-mario-odyssey",
    title: "Super Mario Odyssey",
    cover: "/games/nintendo/cover-01.jpg"
  },
  {
    id: "donkey-kong-bananza",
    title: "Donkey Kong Bananza",
    cover: "/games/nintendo/cover-02.jpg"
  }
];

export interface PlayStationDemoGame {
  id: string;
  title: string;
  banner: string;
  logo: string;
  accent: string;
}

/**
 * PS5 主界面演示数据：background 与卡片共用同一张 key art，
 * logo 为深底亮字的游戏标志（渲染时用 screen 混合去掉黑底），
 * accent 用于选中辉光与圆点色。图片见 public/games/playstation。
 */
export const PLAYSTATION_DEMO_GAMES: readonly PlayStationDemoGame[] = [
  {
    id: "call-of-duty",
    title: "Call of Duty",
    banner: "/games/playstation/cod-banner.jpg",
    logo: "/games/playstation/cod-logo.png",
    accent: "#c8981a"
  },
  {
    id: "kena-bridge-of-spirits",
    title: "Kena: Bridge of Spirits",
    banner: "/games/playstation/kena-banner.jpg",
    logo: "/games/playstation/kena-logo.png",
    accent: "#3ab5e0"
  },
  {
    id: "moving-out",
    title: "Moving Out",
    banner: "/games/playstation/moving-out-banner.jpg",
    logo: "/games/playstation/moving-out-logo.png",
    accent: "#f04c2e"
  }
];
export interface PlayStationDemoFriend {
  id: string;
  name: string;
  status: "online" | "in-game";
  game: string | null;
}

/**
 * PS5 主界面演示数据：好友列表（在线状态与正在玩的游戏）。
 */
export const PLAYSTATION_DEMO_FRIENDS: readonly PlayStationDemoFriend[] = [
  { id: "shadow-ninja", name: "ShadowNinja47", status: "in-game", game: "Call of Duty" },
  { id: "cosmic-gamer", name: "CosmicGamer", status: "online", game: null },
  { id: "pixel-master", name: "PixelMaster99", status: "in-game", game: "Kena: Bridge of Spirits" }
];

export interface PlayStationDemoProfile {
  level: number;
  nextLevel: number;
  levelXp: number;
  nextLevelXp: number;
  trophies: { bronze: number; silver: number; gold: number };
}

/**
 * PS5 主界面演示数据：等级进度与奖杯数量（个人资料面板用）。
 */
export const PLAYSTATION_DEMO_PROFILE: PlayStationDemoProfile = {
  level: 47,
  nextLevel: 48,
  levelXp: 8750,
  nextLevelXp: 10000,
  trophies: { bronze: 38, silver: 12, gold: 4 }
};

export interface PlayStationDemoMessage {
  id: string;
  author: string;
  text: string;
  self?: boolean;
}

/**
 * PS5 主界面演示数据：派对聊天历史（只在本地 state 里追加，不落库）。
 */
export const PLAYSTATION_DEMO_CHAT: readonly PlayStationDemoMessage[] = [
  { id: "m1", author: "SH", text: "上一局打得很漂亮" },
  { id: "m2", author: "CO", text: "准备好排位了吗" }
];
