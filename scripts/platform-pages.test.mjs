import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const PLATFORM_PAGES = [
  "app/games/steam/page.tsx",
  "app/games/steam/library/page.tsx",
  "app/games/nintendoswitch/page.tsx",
  "app/games/playstation/page.tsx"
];

test("平台页只保留传送门与主站入口，不出现照片/工具页链接", () => {
  for (const page of PLATFORM_PAGES) {
    const source = read(page);
    assert.ok(!source.includes('"/photos"'), `${page} 不应链接 /photos`);
    assert.ok(!source.includes('"/tools"'), `${page} 不应链接 /tools`);
  }
});

test("平台外壳的账号入口指向 /games 与 /", () => {
  for (const shell of [
    "components/game/SteamShell.tsx",
    "components/game/NintendoShell.tsx",
    "components/game/PlayStationShell.tsx"
  ]) {
    assert.ok(read(shell).includes("PlatformAvatar"), `${shell} 需要渲染 PlatformAvatar`);
  }

  const avatar = read("components/game/PlatformAvatar.tsx");
  assert.ok(avatar.includes('href="/games"'), "账号菜单需要返回传送门入口");
  assert.ok(avatar.includes('href="/"'), "账号菜单需要返回主站入口");
});

test("传送门列出三个平台且 /game 路由已被移除", () => {
  const platforms = read("lib/platforms.ts");
  assert.ok(platforms.includes('href: "/games/steam"'));
  assert.ok(platforms.includes('href: "/games/nintendoswitch"'));
  assert.ok(platforms.includes('href: "/games/playstation"'));

  const portal = read("components/game/PlatformPortal.tsx");
  assert.ok(!portal.includes('href="/game"'), "旧的 /game 入口必须移除");
});

test("演示数据引用本地静态图，避免外链失效", () => {
  const demo = read("lib/demo-games.ts");
  assert.ok(demo.includes('cover: "/games/nintendo/'));
  assert.ok(demo.includes('banner: "/games/playstation/'));
  assert.ok(!demo.includes("http"), "演示数据不应依赖远程图片地址");
});

test("主界面复刻不渲染说明性标题、统计与提示文案", () => {
  const banned = ["游戏墙", "游戏库", "演示数据", "未接入", "<h1", "<h2", "游玩时长", "进度"];

  for (const file of ["components/game/NintendoHome.tsx", "components/game/PlayStationHome.tsx"]) {
    const source = read(file);

    for (const word of banned) {
      assert.ok(!source.includes(word), `${file} 不应出现「${word}」`);
    }
  }
});

test("主界面保留游戏机本体结构：图标行与选中态", () => {
  const nintendo = read("components/game/NintendoHome.tsx");
  assert.ok(nintendo.includes("styles.dock"), "Switch 主界面需要底部系统图标栏");
  assert.ok(nintendo.includes("keycap"), "Switch 主界面需要手柄键位提示");
  assert.ok(nintendo.includes("tileActive"), "Switch 主界面需要选中态");
  assert.ok(nintendo.includes("styles.info"), "Switch 主界面需要选中游戏的浮层信息");
  assert.ok(nintendo.includes("infoTitle"), "Switch 浮层信息需要显示游戏名");

  const playstation = read("components/game/PlayStationHome.tsx");
  assert.ok(playstation.includes("styles.rail"), "PS5 主界面需要顶部游戏卡片行");
  assert.ok(playstation.includes("cardActive"), "PS5 主界面需要卡片选中态");
  assert.ok(playstation.includes("backdropActive"), "PS5 主界面需要背景联动");
});
test("PS5 主界面保留选中游戏后的附加内容面板", () => {
  const home = read("components/game/PlayStationHome.tsx");
  assert.ok(home.includes("PartyPanel"), "PS5 主界面需要派对面板");
  assert.ok(home.includes("FriendsPanel"), "PS5 主界面需要好友面板");
  assert.ok(home.includes("styles.side"), "右侧面板需要独立容器");

  const panels = read("components/game/PlayStationPanels.tsx");

  for (const word of ["好友", "等级与奖杯", "派对"]) {
    assert.ok(panels.includes(word), `面板文件缺少「${word}」`);
  }
});

test("Steam 概览页使用个人资料页布局与 Steam 等级换算", () => {
  const profile = read("components/game/SteamProfile.tsx");
  const level = read("lib/steam-level.ts");

  assert.ok(profile.includes("styles.showcase"), "Steam 页需要展示柜");
  assert.ok(profile.includes("styles.rail"), "Steam 页需要右栏");
  assert.ok(profile.includes("calculateLevelFromXp"), "Steam 页需要等级换算");
  assert.ok(level.includes("getXpRequiredForLevel"), "等级换算需要沿用每 10 级一档的 Steam 规则");
  assert.ok(level.includes("XP_PER_GAME"), "等级 XP 需要按游戏数折算");
});
