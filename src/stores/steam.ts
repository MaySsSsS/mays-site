import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { GameData, SteamPlayerSummary, GameStats } from "@/types";

export const useSteamStore = defineStore("steam", () => {
  // 状态
  const games = ref<GameData[]>([]);
  const playerInfo = ref<SteamPlayerSummary | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<string | null>(null);

  // 计算属性
  const gameStats = computed<GameStats>(() => {
    const sortedGames = [...games.value].sort(
      (a, b) => b.playtime_forever - a.playtime_forever
    );
    const recentGames = games.value.filter(
      (g: GameData) => g.playtime_2weeks && g.playtime_2weeks > 0
    );

    return {
      totalGames: games.value.length,
      totalPlaytime: games.value.reduce(
        (sum: number, g: GameData) => sum + g.playtime_forever,
        0
      ),
      recentlyPlayed: recentGames.length,
      mostPlayed: sortedGames[0] || null,
    };
  });

  const topGames = computed(() => {
    return [...games.value]
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, 10);
  });

  const recentlyPlayedGames = computed(() => {
    return [...games.value]
      .filter((g) => g.rtime_last_played)
      .sort((a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0))
      .slice(0, 6);
  });

  // 方法
  async function fetchGamesData() {
    loading.value = true;
    error.value = null;

    try {
      // 从静态 JSON 文件加载数据（由 GitHub Actions 生成）
      const baseUrl = import.meta.env.BASE_URL || "/";
      const response = await fetch(`${baseUrl}data/steam-games.json`);
      if (!response.ok) {
        throw new Error("无法加载游戏数据");
      }
      const data = await response.json();
      games.value = data.games || [];
      playerInfo.value = data.player || null;
      lastUpdated.value = data.lastUpdated || null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "加载数据失败";
      console.error("Failed to fetch games data:", e);
    } finally {
      loading.value = false;
    }
  }

  // 格式化游玩时间
  function formatPlaytime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} 分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} 天 ${remainingHours} 小时`;
  }

  // 获取游戏封面图片
  function getGameHeaderImage(appid: number): string {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
  }

  function getGameCapsuleImage(appid: number): string {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`;
  }

  function getGameIconUrl(appid: number, iconHash: string): string {
    return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`;
  }

  return {
    // 状态
    games,
    playerInfo,
    loading,
    error,
    lastUpdated,
    // 计算属性
    gameStats,
    topGames,
    recentlyPlayedGames,
    // 方法
    fetchGamesData,
    formatPlaytime,
    getGameHeaderImage,
    getGameCapsuleImage,
    getGameIconUrl,
  };
});
