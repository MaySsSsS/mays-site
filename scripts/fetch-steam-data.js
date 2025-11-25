/**
 * Steam 数据获取脚本
 * 用于 GitHub Actions 定时获取 Steam 游戏数据
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 - 私人仓库直接配置
const STEAM_API_KEY = "09EDFE628D0F16EDE4A1FFD4F5DDC2E9";
const STEAM_ID = "76561198378879040";

const API_BASE = "https://api.steampowered.com";

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

    // 构建输出数据
    const outputData = {
      lastUpdated: new Date().toISOString(),
      player: player,
      games: mergedGames,
    };

    // 写入文件
    const outputPath = path.join(__dirname, "../public/data/steam-games.json");
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

    console.log(`✅ 成功! 共获取 ${games.length} 款游戏`);
    console.log(`📁 数据已保存到: ${outputPath}`);

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
