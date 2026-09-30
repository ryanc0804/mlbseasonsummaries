export interface Clip {
  id: string;
  title: string;
  description: string;
  playId?: string;       // UUID from MLB play-by-play, used client-side to fetch sporty-videos
  videoUrl?: string;
  thumbnailUrl?: string;
  date: string;       // ISO date string
  gamePk: number;
  atBatNumber: number; // ordinal within the game — orders clips from the same game
  inning: number;
  isTopInning: boolean;
  batter: string;
  pitcher: string;
  exitVelocity?: number;
  launchAngle?: number;
  distance?: number;
  wpa: number;        // Win Probability Added
  xwoba?: number;
  eventType: string;  // "home_run" | "strikeout" | "hit" | etc.
  gameType?: string;  // R = regular season, F = wild card, D = division series, L = LCS, W = World Series
  chapterId?: string;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  startClipIndex: number;
  endClipIndex: number;
  tone: "triumph" | "struggle" | "turning_point" | "clutch" | "milestone";
}

export interface SeasonStats {
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  homeRuns: number;
  teamEra: number;
  teamAvg: number;
  teamOps: number;
  playoffResult?: string;
  division: string;
  divisionRank: number;
}

export interface RecapData {
  teamId: number;
  year: number;
  narrative: string;        // Full AI-written season narrative (markdown)
  chapters: Chapter[];
  clips: Clip[];
  seasonStats: SeasonStats;
  generatedAt?: string;     // ISO timestamp — used to decide staleness for in-progress seasons
}
