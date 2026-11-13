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

test("平台外壳的返回入口指向 /games 与 /", () => {
  for (const shell of [
    "components/game/SteamShell.tsx",
    "components/game/NintendoShell.tsx",
    "components/game/PlayStationShell.tsx",
    "components/game/PlatformAvatar.tsx"
  ]) {
    const source = read(shell);
    assert.ok(source.includes('href="/games"'), `${shell} 需要返回传送门入口`);
    assert.ok(source.includes('href="/"'), `${shell} 需要返回主站入口`);
  }
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
  assert.ok(demo.includes('logo: "/games/playstation/'));
  assert.ok(!demo.includes("http"), "演示数据不应依赖远程图片地址");
});

test("演示数据保留空槽位与进度条所需的字段", () => {
  const demo = read("lib/demo-games.ts");
  assert.ok(demo.includes("progress:"));
  assert.ok(demo.includes("hoursPlayed:"));
  assert.ok(demo.includes("size:"));

  const nintendo = read("components/game/NintendoHome.tsx");
  assert.ok(nintendo.includes("SLOT_COUNT"), "Switch 游戏墙需要空槽位样式");
  assert.ok(nintendo.includes("emptySlot"), "Switch 游戏墙需要空槽位样式");
});