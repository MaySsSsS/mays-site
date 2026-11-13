export interface NintendoDemoGame {
  id: string;
  title: string;
  genre: string;
  cover: string;
  playtime: string;
  lastPlayed: string;
}

export const NINTENDO_DEMO_GAMES: readonly NintendoDemoGame[] = [
  {
    id: "super-mario-odyssey",
    title: "Super Mario Odyssey",
    genre: "3D 平台动作",
    cover: "/games/nintendo/cover-01.jpg",
    playtime: "48 小时",
    lastPlayed: "昨天"
  },
  {
    id: "donkey-kong-bananza",
    title: "Donkey Kong Bananza",
    genre: "动作冒险",
    cover: "/games/nintendo/cover-02.jpg",
    playtime: "12 小时",
    lastPlayed: "3 天前"
  }
];

export interface PlayStationDemoGame {
  id: string;
  title: string;
  genre: string;
  banner: string;
  logo: string;
  accent: string;
  progress: number;
  hoursPlayed: number;
  size: string;
  installed: boolean;
  status: string;
}

export const PLAYSTATION_DEMO_GAMES: readonly PlayStationDemoGame[] = [
  {
    id: "call-of-duty",
    title: "Call of Duty",
    genre: "FPS",
    banner: "/games/playstation/cod-banner.jpg",
    logo: "/games/playstation/cod-logo.png",
    accent: "#c8981a",
    progress: 67,
    hoursPlayed: 203,
    size: "85 GB",
    installed: true,
    status: "战役进度 67%"
  },
  {
    id: "kena-bridge-of-spirits",
    title: "Kena: Bridge of Spirits",
    genre: "动作冒险",
    banner: "/games/playstation/kena-banner.jpg",
    logo: "/games/playstation/kena-logo.png",
    accent: "#3ab5e0",
    progress: 42,
    hoursPlayed: 87,
    size: "27 GB",
    installed: true,
    status: "流程进度 42%"
  },
  {
    id: "moving-out",
    title: "Moving Out",
    genre: "合作闯关",
    banner: "/games/playstation/moving-out-banner.jpg",
    logo: "/games/playstation/moving-out-logo.png",
    accent: "#f04c2e",
    progress: 80,
    hoursPlayed: 65,
    size: "8 GB",
    installed: true,
    status: "关卡进度 80%"
  }
];