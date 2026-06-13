import "server-only";

import aiDailyIndex from "@/public/data/ai-daily/index.json";
import steamSnapshot from "@/public/data/steam-games.json";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";
import { createSampleGroups } from "@/lib/photo";
import type { SignalArenaPublicData } from "@/types/signal-arena";
import type {
  UniverseEvent,
  UniverseConnection,
  UniverseHealthItem,
  UniverseMission,
  UniverseModule,
  UniverseObservatoryData
} from "@/types/universe";

type AiDailyIndex = {
  latestDate: string;
  entries: Array<{
    date: string;
    title: string;
    mode: string;
    summary: string[];
    updatedAt: string;
    path: string;
  }>;
};

type SteamSnapshot = {
  lastUpdated: string | null;
  games: Array<{
    appid: number;
    name: string;
    playtime_forever: number;
    playtime_2weeks?: number;
    rtime_last_played?: number;
  }>;
};

const aiDaily = aiDailyIndex as AiDailyIndex;
const steamData = steamSnapshot as SteamSnapshot;

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "未同步";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatHours(minutes: number) {
  if (minutes <= 0) {
    return "0h";
  }

  return `${Math.round(minutes / 60)}h`;
}

function getMostPlayedGame() {
  return [...steamData.games].sort((a, b) => b.playtime_forever - a.playtime_forever)[0] ?? null;
}

function getRecentGameCount() {
  return steamData.games.filter((game) => (game.playtime_2weeks ?? 0) > 0).length;
}

function getTotalPlaytime() {
  return steamData.games.reduce((sum, game) => sum + game.playtime_forever, 0);
}

function buildModules(signalData: SignalArenaPublicData): UniverseModule[] {
  const latestAi = aiDaily.entries[0];
  const mostPlayed = getMostPlayedGame();
  const samplePhotoGroups = createSampleGroups();
  const photoCount = samplePhotoGroups.reduce((sum, group) => sum + group.photos.length, 0);

  return [
    {
      id: "ai-daily",
      eyebrow: "AI",
      title: "AI Daily",
      path: "/ai-daily",
      status: aiDaily.latestDate ? "live" : "watch",
      tone: "yellow",
      summary: latestAi?.summary[0] ?? "等待下一次 AI Daily 同步。",
      signal: `${aiDaily.entries.length} 天日报，最新 ${aiDaily.latestDate}`,
      actionLabel: "Read daily",
      focusHint: "用来捕捉 AI 行业变化，给工具、量化和内容方向提供外部信号。",
      metricLabel: "Latest",
      metricValue: aiDaily.latestDate,
      secondaryMetric: latestAi ? latestAi.mode : "unknown",
      orbit: { x: 72, y: 23, size: 140 }
    },
    {
      id: "quant-lab",
      eyebrow: "QUANT",
      title: "Quant Lab",
      path: "/signal-arena",
      status: signalData.dashboard.sourceStatus === "fallback" ? "watch" : "live",
      tone: "red",
      summary: signalData.operations.latestRunSummary ?? "等待 Quant Lab Worker 同步。",
      signal: `${signalData.strategy.version} · ${signalData.operations.label}`,
      actionLabel: "Open lab",
      focusHint: "量化模拟盘的运行状态，是目前最需要持续观察和修正的主动系统。",
      metricLabel: "Return",
      metricValue: `${(signalData.dashboard.returnRate * 100).toFixed(2)}%`,
      secondaryMetric: `${signalData.operations.equityPointCount} equity points`,
      orbit: { x: 34, y: 35, size: 168 }
    },
    {
      id: "game",
      eyebrow: "GAME",
      title: "Player One",
      path: "/game",
      status: "live",
      tone: "blue",
      summary: mostPlayed ? `最常驻游戏：${mostPlayed.name}。` : "Steam 快照等待同步。",
      signal: `${steamData.games.length} games · ${formatHours(getTotalPlaytime())}`,
      actionLabel: "View library",
      focusHint: "游戏库提供长期偏好、游玩节奏和个人记忆线索。",
      metricLabel: "Games",
      metricValue: String(steamData.games.length),
      secondaryMetric: `${getRecentGameCount()} recent`,
      orbit: { x: 24, y: 68, size: 136 }
    },
    {
      id: "photos",
      eyebrow: "PHOTO",
      title: "City Files",
      path: "/photos",
      status: "quiet",
      tone: "green",
      summary: `示例足迹覆盖 ${samplePhotoGroups.map((group) => group.city).join("、")}。`,
      signal: `${samplePhotoGroups.length} city files · ${photoCount} sample photos`,
      actionLabel: "Open map",
      focusHint: "照片足迹适合从地理位置继续长成路线、记忆和故事层。",
      metricLabel: "Cities",
      metricValue: String(samplePhotoGroups.length),
      secondaryMetric: `${photoCount} photos`,
      orbit: { x: 63, y: 70, size: 128 }
    },
    {
      id: "tools",
      eyebrow: "TOOLS",
      title: "Signal Lab",
      path: "/tools",
      status: "building",
      tone: "violet",
      summary: "QR、Style Prompt、Word 转 Markdown 等工具构成了可继续扩展的工具坞。",
      signal: "4 active tools · local-first",
      actionLabel: "Dock tools",
      focusHint: "工具分支承载具体生产力能力，但不会替代主站级页面叙事。",
      metricLabel: "Tools",
      metricValue: "04",
      secondaryMetric: "browser local",
      orbit: { x: 50, y: 50, size: 118 }
    }
  ];
}

function buildEvents(signalData: SignalArenaPublicData): UniverseEvent[] {
  const aiEvents = aiDaily.entries.slice(0, 8).map<UniverseEvent>((entry) => ({
    id: `ai-${entry.date}`,
    moduleId: "ai-daily",
    title: entry.title,
    description: entry.summary.slice(0, 2).join(" / "),
    occurredAt: entry.updatedAt,
    href: entry.path,
    kind: "dispatch",
    impact: entry.mode === "ai_summary" ? "high" : "medium",
    relatedModuleIds: ["tools", "quant-lab"],
    nextAction: "阅读日报并把值得跟进的主题转成工具或量化研究任务。"
  }));
  const signalEvent: UniverseEvent = {
    id: "quant-snapshot",
    moduleId: "quant-lab",
    title: "Quant Lab strategy snapshot",
    description: signalData.operations.latestRunSummary ?? "等待 Quant Lab Worker 同步。",
    occurredAt: signalData.dashboard.updatedAt,
    href: "/signal-arena",
    kind: "snapshot",
    impact: signalData.dashboard.sourceStatus === "fallback" ? "medium" : "high",
    relatedModuleIds: ["ai-daily", "tools"],
    nextAction: "检查 Q-Alpha v1 的账号状态、策略日志和下一步回测任务。"
  };
  const gameEvent: UniverseEvent = {
    id: "game-snapshot",
    moduleId: "game",
    title: "Steam library snapshot",
    description: `${steamData.games.length} 款游戏，总时长 ${formatHours(getTotalPlaytime())}。`,
    occurredAt: steamData.lastUpdated ?? new Date().toISOString(),
    href: "/game",
    kind: "memory",
    impact: getRecentGameCount() > 0 ? "medium" : "low",
    relatedModuleIds: ["photos"],
    nextAction: "把长期游玩偏好整理成更有故事感的个人档案。"
  };
  const toolsEvent: UniverseEvent = {
    id: "tools-dock",
    moduleId: "tools",
    title: "Tools dock status",
    description: "工具坞保持为具体工具入口，主站级页面继续承担跨模块导航和观察。",
    occurredAt: new Date().toISOString(),
    href: "/tools",
    kind: "tool",
    impact: "medium",
    relatedModuleIds: ["ai-daily", "quant-lab"],
    nextAction: "从工具坞挑选可复用能力，反哺新的主站模块。"
  };

  return [toolsEvent, signalEvent, gameEvent, ...aiEvents].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

function buildMissions(): UniverseMission[] {
  return [
    {
      id: "mission-ai-daily",
      moduleId: "ai-daily",
      title: "观察 12:00 日报同步",
      detail: `当前最新日报为 ${aiDaily.latestDate}，需要继续确认每日自动同步稳定。`,
      href: "/ai-daily",
      priority: "now",
      estimate: "每日 12:00 后",
      output: "确认最新日报进入归档，并观察是否仍为 ai_summary。"
    },
    {
      id: "mission-quant-key",
      moduleId: "quant-lab",
      title: "等待有效 Agent World key",
      detail: "Quant Lab 已切到 Q-Alpha v1，但真实运行仍受上游账号 key 阻塞。",
      href: "/signal-arena/logs",
      priority: "now",
      estimate: "拿到有效 key 后",
      output: "完成 dry-run，确认 strategyTrace 写入 quant-v1。"
    },
    {
      id: "mission-game-memory",
      moduleId: "game",
      title: "补一层游戏记忆解释",
      detail: "Steam 快照已稳定，可继续把时长、最近游玩和长期偏好组织成故事线。",
      href: "/game",
      priority: "next",
      estimate: "1 个小版本",
      output: "游戏页新增偏好摘要或时间线叙事。"
    },
    {
      id: "mission-photo-route",
      moduleId: "photos",
      title: "让足迹从地图变成路线",
      detail: "照片页已有城市结构，下一步可以做时间路线、城市故事和精选回忆。",
      href: "/photos",
      priority: "later",
      estimate: "后续里程碑",
      output: "从城市点位扩展到路线与回忆卡片。"
    }
  ];
}

function buildConnections(): UniverseConnection[] {
  return [
    {
      id: "ai-to-tools",
      from: "ai-daily",
      to: "tools",
      label: "Trend to tool",
      detail: "日报里的高频需求可以转成新工具候选。",
      strength: "primary"
    },
    {
      id: "ai-to-quant",
      from: "ai-daily",
      to: "quant-lab",
      label: "Research signal",
      detail: "AI 与市场相关新闻可以成为每周量化复盘的外部观察。",
      strength: "support"
    },
    {
      id: "game-to-photos",
      from: "game",
      to: "photos",
      label: "Memory layer",
      detail: "游戏和照片都能沉淀成个人记忆，而不是只做列表。",
      strength: "watch"
    },
    {
      id: "quant-to-tools",
      from: "quant-lab",
      to: "tools",
      label: "Lab tooling",
      detail: "量化的参数、回测、日志分析后续可以拆成专门工具。",
      strength: "primary"
    }
  ];
}

function buildHealth(signalData: SignalArenaPublicData): UniverseHealthItem[] {
  return [
    {
      label: "AI Daily",
      value: aiDaily.latestDate,
      detail: `${aiDaily.entries.length} archived days, last updated ${formatDate(aiDaily.entries[0]?.updatedAt)}`,
      tone: "good"
    },
    {
      label: "Quant Lab",
      value: signalData.dashboard.sourceStatus,
      detail: signalData.operations.latestRunSummary ?? "No latest run summary",
      tone: signalData.dashboard.sourceStatus === "fallback" ? "watch" : "good"
    },
    {
      label: "Steam Snapshot",
      value: String(steamData.games.length),
      detail: `last updated ${formatDate(steamData.lastUpdated)}`,
      tone: "good"
    },
    {
      label: "Photo Files",
      value: String(createSampleGroups().length),
      detail: "client-first storage with sample city groups",
      tone: "muted"
    }
  ];
}

export async function getUniverseObservatoryData(): Promise<UniverseObservatoryData> {
  const signalData = await getSignalArenaPublicData();

  return {
    updatedAt: new Date().toISOString(),
    modules: buildModules(signalData),
    events: buildEvents(signalData),
    missions: buildMissions(),
    connections: buildConnections(),
    health: buildHealth(signalData)
  };
}
