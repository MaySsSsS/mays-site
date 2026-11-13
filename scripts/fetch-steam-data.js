/**
 * Steam 数据获取脚本
 * 用于 GitHub Actions 定时获取 Steam 游戏数据并上传到 Cloudflare Worker
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Steam 配置 - 从环境变量读取
const STEAM_API_KEY = process.env.STEAM_API_KEY || "";
const STEAM_ID = process.env.STEAM_ID || "76561198378879040";

// Game API Worker 配置
const GAME_API_URL =
  process.env.GAME_API_URL || "https://mays-game-api.mays.workers.dev";
const UPLOAD_SECRET = process.env.GAME_UPLOAD_SECRET || "";

const API_BASE = "https://api.steampowered.com";
// 商店素材接口：Web API 的 GetOwnedGames 只给 32×32 图标哈希，头图/胶囊图
// 只能走商店接口取（返回的是 shared.akamai.steamstatic.com 上带内容哈希的路径）
const STORE_DETAILS_API = "https://store.steampowered.com/api/appdetails";
const STORE_REQUEST_DELAY_MS = 1000;
const SNAPSHOT_PATH = path.join(__dirname, "../public/data/steam-games.json");

// 通过 Worker API 上传数据
async function uploadToWorker(data) {
  const response = await fetch(`${GAME_API_URL}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${UPLOAD_SECRET}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${text}`);
  }

  return true;
}

async function fetchPlayerSummary() {
  const url = `${API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${STEAM_ID}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.response.players[0] || null;
}

async function fetchOwnedGames() {
  const url = `${API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true`;
  const response = await fetch(url);
  const data = await response.json();
  return data.response.games || [];
}

async function fetchRecentlyPlayedGames() {
  const url = `${API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&count=10`;
  const response = await fetch(url);
  const data = await response.json();
  return data.response.games || [];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchStoreAssets(appid) {
  const url = `${STORE_DETAILS_API}?appids=${appid}&filters=basic&l=schinese`;
  const response = await fetch(url, { headers: { "User-Agent": "mays-site/1.0" } });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const entry = payload?.[String(appid)];

  if (!entry?.success) {
    return null;
  }

  const { header_image: headerImage, capsule_image: capsuleImage } = entry.data ?? {};

  if (!headerImage && !capsuleImage) {
    return null;
  }

  return { header_image: headerImage, capsule_image: capsuleImage };
}

/** 上一份快照里已经补齐的封面，避免每天重复查询 */
function loadKnownAssets() {
  try {
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    const known = new Map();

    for (const game of snapshot.games ?? []) {
      if (game.header_image) {
        known.set(game.appid, {
          header_image: game.header_image,
          capsule_image: game.capsule_image
        });
      }
    }

    return known;
  } catch {
    return new Map();
  }
}

/**
 * 给缺封面的游戏补真实素材地址。
 * 已补齐的（快照里带着 header_image）直接跳过，所以日常运行只查新增游戏；
 * 单个 appid 失败（例如没有商店页的测试版）只留空，不影响整体采集。
 */
async function enrichGameAssets(games) {
  const known = loadKnownAssets();
  const targets = games.filter(
    (game) => !game.header_image && !known.has(game.appid)
  );

  if (targets.length === 0) {
    console.log("🖼️ 封面已齐备，跳过商店接口查询");
    return games.map((game) => {
      const asset = known.get(game.appid);
      return asset ? { ...game, ...asset } : game;
    });
  }

  console.log(`🖼️ 补全封面: ${targets.length} 款需要查询商店接口...`);
  const assets = new Map(known);
  let failed = 0;

  for (const [index, game] of targets.entries()) {
    try {
      const asset = await fetchStoreAssets(game.appid);

      if (asset) {
        assets.set(game.appid, asset);
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
    }

    if (index < targets.length - 1) {
      await sleep(STORE_REQUEST_DELAY_MS);
    }
  }

  console.log(`🖼️ 封面补全完成: 成功 ${assets.size - known.size}, 无素材/失败 ${failed}`);

  return games.map((game) => {
    const asset = assets.get(game.appid);
    return asset ? { ...game, ...asset } : game;
  });
}

async function main() {
  console.log("🎮 开始获取 Steam 数据...");

  if (!STEAM_API_KEY || !STEAM_ID) {
    console.error("❌ 错误: 请设置 STEAM_API_KEY 和 STEAM_ID 环境变量");
    process.exit(1);
  }

  try {
    // 获取玩家信息
    console.log("📝 获取玩家信息...");
    const player = await fetchPlayerSummary();

    // 获取拥有的游戏
    console.log("🎯 获取游戏库...");
    const games = await fetchOwnedGames();

    // 获取最近游玩的游戏（用于补充 playtime_2weeks 数据）
    console.log("🕐 获取最近游玩...");
    const recentGames = await fetchRecentlyPlayedGames();

    // 合并最近游玩数据
    const recentGamesMap = new Map(recentGames.map((g) => [g.appid, g]));
    const mergedGames = games.map((game) => {
      const recent = recentGamesMap.get(game.appid);
      return {
        ...game,
        playtime_2weeks: recent?.playtime_2weeks || 0,
      };
    });

    // 补全封面地址（商店接口，失败只留空）
    const enrichedGames = await enrichGameAssets(mergedGames);

    // 构建输出数据
    const outputData = {
      lastUpdated: new Date().toISOString(),
      player: player,
      games: enrichedGames,
    };

    // 上传到 Cloudflare Worker (R2)
    if (UPLOAD_SECRET) {
      console.log("☁️ 通过 Worker API 上传到 R2...");
      await uploadToWorker(outputData);
      console.log("✅ 上传成功!");
    }

    // 同时保存本地文件（用于开发和备份）
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(outputData, null, 2));

    console.log(`✅ 成功! 共获取 ${games.length} 款游戏`);
    console.log(`📁 数据已保存到: ${SNAPSHOT_PATH}`);

    // 输出统计信息
    const totalPlaytime = games.reduce(
      (sum, g) => sum + (g.playtime_forever || 0),
      0
    );
    const playedGames = games.filter((g) => g.playtime_forever > 0).length;
    console.log(
      `📊 统计: ${playedGames} 款已游玩, 总时长 ${Math.floor(
        totalPlaytime / 60
      )} 小时`
    );
  } catch (error) {
    console.error("❌ 获取数据失败:", error.message);
    process.exit(1);
  }
}

main();
