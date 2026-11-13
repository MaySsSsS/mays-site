import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("封面地址优先用采集到的真实地址，保留猜路径作为回退", () => {
  const game = read("lib/game.ts");

  assert.ok(game.includes('game.header_image ??'), "头图应优先使用采集到的 header_image");
  assert.ok(game.includes('game.capsule_image ??'), "胶囊图应优先使用采集到的 capsule_image");
  assert.ok(
    game.includes("cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg"),
    "老游戏仍需回退到可预测的 CDN 路径"
  );
});

test("所有封面调用点传入整个游戏对象而不是 appid", () => {
  const callSites = [
    "components/game/GameCard.tsx",
    "components/game/FeaturedGame.tsx",
    "components/game/SteamProfile.tsx"
  ];

  for (const file of callSites) {
    const source = read(file);
    assert.ok(source.includes("getGameHeaderImage(game)"), `${file} 应传整个游戏对象`);
    assert.ok(!source.includes("getGameHeaderImage(game.appid)"), `${file} 仍在传 appid`);
  }

  const store = read("stores/steam-store.ts");
  assert.ok(store.includes("getGameHeaderImage: (game: GameData) => string"), "store 选择器签名需同步");
});

test("采集脚本在 Actions 里补全商店素材，且只查缺封面的游戏", () => {
  const script = read("scripts/fetch-steam-data.js");

  assert.ok(script.includes("https://store.steampowered.com/api/appdetails"), "需要调用商店素材接口");
  assert.ok(script.includes("enrichGameAssets"), "需要补全封面的步骤");
  assert.ok(script.includes("loadKnownAssets"), "需要复用上一份快照里已补齐的封面");
  assert.ok(script.includes("known.has(game.appid)"), "已补齐的游戏不应重复查询");
  assert.ok(script.includes("STORE_REQUEST_DELAY_MS"), "商店接口需要有请求间隔");
  assert.ok(script.includes("const enrichedGames = await enrichGameAssets"), "补全结果要写回输出数据");
});

test("商店接口失败不会中断采集", () => {
  const script = read("scripts/fetch-steam-data.js");
  const enrichBlock = script.slice(
    script.indexOf("async function enrichGameAssets"),
    script.indexOf("async function main()")
  );

  assert.ok(enrichBlock.includes("failed += 1"), "单个 appid 失败要计数继续");
  assert.ok(enrichBlock.includes("catch"), "商店接口异常需要捕获");
});