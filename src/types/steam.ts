// Steam API 相关类型定义

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number; // 总游玩时间（分钟）
  playtime_2weeks?: number; // 最近两周游玩时间（分钟）
  img_icon_url: string;
  img_logo_url?: string;
  has_community_visible_stats?: boolean;
  playtime_windows_forever?: number;
  playtime_mac_forever?: number;
  playtime_linux_forever?: number;
  rtime_last_played?: number; // 最后游玩时间戳
}

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number;
  communityvisibilitystate: number;
  profilestate?: number;
  lastlogoff?: number;
  commentpermission?: number;
  realname?: string;
  primaryclanid?: string;
  timecreated?: number;
  gameid?: string;
  gameserverip?: string;
  gameextrainfo?: string;
  loccountrycode?: string;
  locstatecode?: string;
  loccityid?: number;
}

export interface SteamGamesResponse {
  response: {
    game_count: number;
    games: SteamGame[];
  };
}

export interface SteamPlayerResponse {
  response: {
    players: SteamPlayerSummary[];
  };
}

// 本地存储的游戏数据（包含额外信息）
export interface GameData extends SteamGame {
  header_image?: string;
  capsule_image?: string;
}

// 统计数据
export interface GameStats {
  totalGames: number;
  totalPlaytime: number; // 分钟
  recentlyPlayed: number;
  mostPlayed: GameData | null;
}
