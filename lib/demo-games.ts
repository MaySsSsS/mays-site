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
  accent: string;
}

/**
 * PS5 主界面演示数据：background 用同一张 key art，
 * accent 用于选中图标的辉光颜色。图片见 public/games/playstation。
 */
export const PLAYSTATION_DEMO_GAMES: readonly PlayStationDemoGame[] = [
  {
    id: "call-of-duty",
    title: "Call of Duty",
    banner: "/games/playstation/cod-banner.jpg",
    accent: "#c8981a"
  },
  {
    id: "kena-bridge-of-spirits",
    title: "Kena: Bridge of Spirits",
    banner: "/games/playstation/kena-banner.jpg",
    accent: "#3ab5e0"
  },
  {
    id: "moving-out",
    title: "Moving Out",
    banner: "/games/playstation/moving-out-banner.jpg",
    accent: "#f04c2e"
  }
];