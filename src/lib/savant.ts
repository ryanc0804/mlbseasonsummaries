import type { Clip, SeasonStats } from "@/lib/types";
import { TEAM_BY_ID } from "@/lib/teams";

const MLB_STATS_BASE = "https://statsapi.mlb.com/api/v1";
const SAVANT_BASE = "https://baseballsavant.mlb.com";

// Watch time is a CAP, not a target: only plays clearing the impact threshold are
// included, so eventful seasons run long (up to the cap) and dull ones run short.
// Sporty single-play clips run ~30s, so a 20-minute cap works out to 40 clips max.
const MAX_RUNTIME_MINUTES = parseFloat(process.env.RECAP_MAX_MINUTES ?? "20");
const AVG_CLIP_SECONDS = 30;
const MAX_CLIPS = Math.max(10, Math.round((MAX_RUNTIME_MINUTES * 60) / AVG_CLIP_SECONDS));
const MIN_WPA = 0.35;   // a play must have swung win probability by 35%+ to make the cut
const MIN_CLIPS = 15;   // ...but every recap gets at least this many

const BROWSER_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Game types: R = regular season, F = wild card, D = division series, L = LCS, W = World Series
async function fetchStatcastCsv(team: string, year: number, playerType: "batter" | "pitcher", gameTypes: string): Promise<RawPlay[]> {
  const params = new URLSearchParams({
    all: "true",
    hfTeam: `${team}|`,
    hfSea: `${year}|`,
    hfGT: gameTypes,
    player_type: playerType,
    type: "details",
    min_pitches: "0",
    min_results: "0",
    min_pas: "0",
    sort_col: "pitches",
    sort_order: "desc",
  });
  const res = await fetch(
    `${SAVANT_BASE}/statcast_search/csv?${params.toString()}`,
    { headers: { "User-Agent": BROWSER_UA, Accept: "text/csv,text/plain,*/*" } }
  );
  if (!res.ok) throw new Error(`Baseball Savant returned ${res.status}`);
  const plays = parseSavantCsv(await res.text(), playerType);
  // Savant caps CSV exports at 25,000 rows — a full season of pitch data sits right at
  // that line, which is why postseason is fetched as a separate query.
  if (plays.length >= 25000) {
    console.warn(`[savant] WARNING: ${playerType}/${gameTypes} hit the 25k row cap — data may be truncated`);
  }
  return plays;
}

export async function fetchTopClips(teamId: number, year: number): Promise<Clip[]> {
  const team = TEAM_BY_ID[teamId];
  if (!team) throw new Error(`Unknown team ID: ${teamId}`);

  // Regular season and postseason are separate queries: a full season of pitch data
  // sits at Savant's 25k row cap, which would silently truncate October games.
  const [batterPlays, pitcherPlays, psBatterPlays, psPitcherPlays] = await Promise.all([
    fetchStatcastCsv(team.abbreviation, year, "batter", "R|"),
    fetchStatcastCsv(team.abbreviation, year, "pitcher", "R|"),
    fetchStatcastCsv(team.abbreviation, year, "batter", "F|D|L|W|"),
    fetchStatcastCsv(team.abbreviation, year, "pitcher", "F|D|L|W|"),
  ]);
  console.log(`[savant] Parsed ${batterPlays.length}+${pitcherPlays.length} regular season, ${psBatterPlays.length}+${psPitcherPlays.length} postseason plays`);

  const ranked = [...batterPlays, ...pitcherPlays, ...psBatterPlays, ...psPitcherPlays]
    .filter((p) => p.wpa !== null && p.events && p.game_pk)
    .sort((a, b) => Math.abs(b.wpa!) - Math.abs(a.wpa!))
    .filter(dedupeAtBat());

  if (ranked.length === 0) {
    throw new Error("No Statcast play data found (data available from ~2017 onward).");
  }

  // For playoff teams, guarantee October is represented: reserve slots for the top
  // postseason plays, then fill the rest with the best of the whole season.
  const MIN_POSTSEASON = 8;
  const guaranteed = ranked.filter((p) => p.game_type !== "R").slice(0, MIN_POSTSEASON);
  const guaranteedKeys = new Set(guaranteed.map((p) => `${p.game_pk}-${p.at_bat_number}`));

  // Only plays above the impact threshold count toward the cap — a dull season
  // produces a shorter recap rather than being padded out with forgettable plays.
  const significant = ranked.filter((p) => Math.abs(p.wpa!) >= MIN_WPA);
  const base = significant.length >= MIN_CLIPS ? significant : ranked.slice(0, MIN_CLIPS);

  const topPlays = [
    ...guaranteed,
    ...base.filter((p) => !guaranteedKeys.has(`${p.game_pk}-${p.at_bat_number}`)),
  ]
    .slice(0, MAX_CLIPS)
    .sort((a, b) => Math.abs(b.wpa!) - Math.abs(a.wpa!));

  console.log(`[savant] Selected ${topPlays.length} clips (${significant.length} plays cleared the ${MIN_WPA} WPA bar, cap ${MAX_CLIPS})`);

  console.log(`[savant] ${topPlays.length} top plays — fetching play IDs and highlights…`);

  const uniqueGamePks = [...new Set(topPlays.map((p) => p.game_pk))];
  const playIdsByGame = new Map<string, Map<number, string>>();
  const highlightsByGame = new Map<string, GameHighlight[]>();

  await Promise.all(
    uniqueGamePks.map(async (gamePk) => {
      const [playIds, highlights] = await Promise.all([
        fetchPlayIds(gamePk),
        fetchGameHighlights(gamePk),
      ]);
      playIdsByGame.set(gamePk, playIds);
      highlightsByGame.set(gamePk, highlights);
    })
  );

  const clips = topPlays.map((play) => {
    const atBatIndex = parseInt(play.at_bat_number ?? "1") - 1;
    const playId = playIdsByGame.get(play.game_pk)?.get(atBatIndex);
    const highlights = highlightsByGame.get(play.game_pk) ?? [];
    const highlight = matchHighlightStrict(play, highlights);
    return buildClip(play, team.abbreviation, playId, highlight?.videoUrl, highlight?.thumbnailUrl);
  });

  const withSporty = clips.filter((c) => c.playId).length;
  const withHighlight = clips.filter((c) => c.videoUrl).length;
  console.log(`[savant] ${clips.length} clips (${withSporty} with playId, ${withHighlight} with highlight fallback)`);

  return clips.slice(0, MAX_CLIPS);
}

export async function fetchSeasonStats(teamId: number, year: number): Promise<SeasonStats> {
  const team = TEAM_BY_ID[teamId];

  const [hitRes, pitchRes, playoffResult] = await Promise.all([
    fetch(`${MLB_STATS_BASE}/teams/${teamId}/stats?stats=season&season=${year}&group=hitting`),
    fetch(`${MLB_STATS_BASE}/teams/${teamId}/stats?stats=season&season=${year}&group=pitching`),
    fetchPlayoffResult(teamId, year),
  ]);

  let wins = 0, losses = 0, runsScored = 0, runsAllowed = 0;
  let homeRuns = 0, teamAvg = 0, teamOps = 0, teamEra = 0;

  if (hitRes.ok) {
    const s = (await hitRes.json())?.stats?.[0]?.splits?.[0]?.stat ?? {};
    runsScored = Number(s.runs ?? 0);
    homeRuns = Number(s.homeRuns ?? 0);
    teamAvg = Number(s.avg ?? 0);
    teamOps = Number(s.ops ?? 0);
  }

  if (pitchRes.ok) {
    const s = (await pitchRes.json())?.stats?.[0]?.splits?.[0]?.stat ?? {};
    // Team W-L record only exists in the pitching group (pitcher decisions sum to it)
    wins = Number(s.wins ?? 0);
    losses = Number(s.losses ?? 0);
    runsAllowed = Number(s.runs ?? 0);
    teamEra = Number(s.era ?? 0);
  }

  return { wins, losses, runsScored, runsAllowed, homeRuns, teamEra, teamAvg, teamOps, playoffResult,
           division: `${team.league} ${team.division}`, divisionRank: 0 };
}

// ---------------------------------------------------------------------------
// Playoff result — how far did the team get in October?
// ---------------------------------------------------------------------------

const ROUND_ORDER = ["F", "D", "L", "W"] as const;

async function fetchPlayoffResult(teamId: number, year: number): Promise<string | undefined> {
  const team = TEAM_BY_ID[teamId];
  try {
    const res = await fetch(`${MLB_STATS_BASE}/schedule/postseason?season=${year}`);
    if (!res.ok) return undefined;
    const data = await res.json();

    // Collect all completed postseason games involving this team, grouped by round
    const gamesByRound = new Map<string, Array<{ date: string; won: boolean }>>();
    for (const dateEntry of data?.dates ?? []) {
      for (const game of dateEntry?.games ?? []) {
        if (game?.status?.codedGameState !== "F") continue; // finals only
        const home = game?.teams?.home, away = game?.teams?.away;
        const side = home?.team?.id === teamId ? home : away?.team?.id === teamId ? away : null;
        if (!side) continue;
        const round = game.gameType as string;
        if (!gamesByRound.has(round)) gamesByRound.set(round, []);
        gamesByRound.get(round)!.push({ date: game.gameDate, won: side.isWinner === true });
      }
    }
    if (gamesByRound.size === 0) return undefined;

    // Furthest round reached; the winner of a series' final game is the series winner
    const lastRound = ROUND_ORDER.filter((r) => gamesByRound.has(r)).pop()!;
    const games = gamesByRound.get(lastRound)!.sort((a, b) => a.date.localeCompare(b.date));
    const wonSeries = games[games.length - 1].won;

    const lg = team.league; // AL | NL
    switch (lastRound) {
      case "W": return wonSeries ? "Won the World Series" : "Lost the World Series";
      case "L": return wonSeries ? `Won the ${lg}CS` : `Lost in the ${lg}CS`;
      case "D": return wonSeries ? `Won the ${lg}DS` : `Lost in the ${lg}DS`;
      case "F": return wonSeries ? "Won the Wild Card round" : "Lost in the Wild Card round";
      default:  return undefined;
    }
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Game highlights (fallback when sporty-video unavailable)
// ---------------------------------------------------------------------------

interface GameHighlight {
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

const PRESSER_KEYWORDS = ["interview", "press conference", "postgame", "pre-game presser", "manager", "talks about", "speaks to", "previews", "react", "reaction"];

function parseDurationSeconds(dur: string | undefined): number {
  if (!dur) return 0;
  const parts = dur.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

async function fetchGameHighlights(gamePk: string): Promise<GameHighlight[]> {
  try {
    const res = await fetch(`${MLB_STATS_BASE}/game/${gamePk}/content`);
    if (!res.ok) return [];
    const data = await res.json();
    const items: unknown[] = data?.highlights?.highlights?.items ?? [];
    const highlights: GameHighlight[] = [];
    for (const item of items) {
      const i = item as {
        headline?: string;
        duration?: string;
        playbacks?: Array<{ name: string; url: string }>;
        image?: { cuts?: Array<{ src: string; width?: number }> };
      };
      const title = (i.headline ?? "").toLowerCase();
      if (PRESSER_KEYWORDS.some((kw) => title.includes(kw))) continue;
      if (parseDurationSeconds(i.duration) > 180) continue;
      const playbacks = i.playbacks ?? [];
      const video = playbacks.find((p) => p.name === "mp4Avc") ?? playbacks.find((p) => p.url?.endsWith(".mp4")) ?? playbacks[0];
      if (!video?.url) continue;
      const cuts = i.image?.cuts ?? [];
      const thumb = cuts.find((c) => c.width && c.width >= 400 && c.width <= 800)?.src ?? cuts[0]?.src;
      highlights.push({ title: i.headline ?? "", videoUrl: video.url, thumbnailUrl: thumb });
    }
    return highlights;
  } catch {
    return [];
  }
}

const HIGHLIGHTABLE_EVENTS = new Set([
  "home_run", "triple", "double", "single", "walk", "hit_by_pitch", "sac_fly", "sac_bunt",
]);

const EVENT_KEYWORDS: Record<string, string[]> = {
  home_run: ["home run", "homer"],
  double: ["doubles", " double"],
  triple: ["triples", " triple"],
  single: ["singles", " single", "rbi single"],
  walk: ["walks", "walk"],
};

function matchHighlightStrict(play: RawPlay, highlights: GameHighlight[]): GameHighlight | undefined {
  if (play.isPitcher) return undefined; // pitcher-perspective plays don't have our team's highlights
  if (!HIGHLIGHTABLE_EVENTS.has(play.events)) return undefined;
  const lastName = play.player.split(",")[0].trim().toLowerCase();
  if (!lastName) return undefined;
  const nameMatches = highlights.filter((h) => h.title.toLowerCase().includes(lastName));
  if (nameMatches.length === 0) return undefined;
  if (nameMatches.length === 1) return nameMatches[0];
  const keywords = EVENT_KEYWORDS[play.events] ?? [];
  const eventMatch = nameMatches.find((h) => keywords.some((kw) => h.title.toLowerCase().includes(kw)));
  return eventMatch ?? nameMatches[0];
}

// ---------------------------------------------------------------------------
// Play-by-play → playId UUIDs (used client-side to fetch sporty-videos)
// ---------------------------------------------------------------------------

async function fetchPlayIds(gamePk: string): Promise<Map<number, string>> {
  try {
    const res = await fetch(`${MLB_STATS_BASE}/game/${gamePk}/playByPlay`);
    if (!res.ok) return new Map();
    const data = await res.json();
    const map = new Map<number, string>();
    for (const play of data?.allPlays ?? []) {
      const idx: number | undefined = play?.about?.atBatIndex;
      const events: Array<{ playId?: string }> = play?.playEvents ?? [];
      const playId = events[events.length - 1]?.playId;
      if (playId && idx !== undefined) map.set(idx, playId);
    }
    return map;
  } catch {
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Statcast CSV parsing
// ---------------------------------------------------------------------------

interface RawPlay {
  game_pk: string;
  game_date: string;
  game_type: string;   // R, F, D, L, W
  inning: string;
  inning_topbot: string;
  home_team: string;
  player: string;      // "Last, First" — batter when batting, pitcher when pitching
  isPitcher: boolean;
  events: string;
  description: string;
  wpa: number | null;  // delta_home_win_exp — from HOME team's perspective
  estimated_woba_using_speedangle?: number;
  launch_speed?: number;
  launch_angle?: number;
  hit_distance_sc?: number;
  at_bat_number?: string;
}

function parseSavantCsv(csv: string, playerType: "batter" | "pitcher"): RawPlay[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const plays: RawPlay[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j]?.replace(/^"|"$/g, "") ?? ""; });

    const wpa = parseFloat(row["delta_home_win_exp"]);
    plays.push({
      game_pk: row["game_pk"] || "",
      game_date: row["game_date"] || "",
      game_type: row["game_type"] || "R",
      inning: row["inning"] || "1",
      inning_topbot: row["inning_topbot"] || "Top",
      home_team: row["home_team"] || "",
      player: row["player_name"] || "Unknown",
      isPitcher: playerType === "pitcher",
      events: row["events"] || "",
      description: row["des"] || "",
      wpa: isNaN(wpa) ? null : wpa,
      estimated_woba_using_speedangle: parseOptFloat(row["estimated_woba_using_speedangle"]),
      launch_speed: parseOptFloat(row["launch_speed"]),
      launch_angle: parseOptFloat(row["launch_angle"]),
      hit_distance_sc: parseOptFloat(row["hit_distance_sc"]),
      at_bat_number: row["at_bat_number"],
    });
  }
  return plays;
}

function dedupeAtBat() {
  const seen = new Set<string>();
  return (play: RawPlay) => {
    const key = `${play.game_pk}-${play.at_bat_number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function parseOptFloat(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

function buildClip(play: RawPlay, teamAbbr: string, playId: string | undefined, videoUrl?: string, thumbnailUrl?: string): Clip {
  const event = play.events.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const isHomeTeam = play.home_team.toUpperCase() === teamAbbr.toUpperCase();
  const teamWpa = (play.wpa ?? 0) * (isHomeTeam ? 1 : -1);

  const [last, first] = play.player.split(",").map((s: string) => s.trim());
  const displayName = first ? `${first} ${last}` : last;

  return {
    id: `${play.game_pk}-${play.at_bat_number}-${play.inning}`,
    title: `${event} — ${displayName}`,
    description: play.description,
    playId,
    videoUrl,
    thumbnailUrl,
    date: play.game_date,
    gamePk: parseInt(play.game_pk),
    atBatNumber: parseInt(play.at_bat_number ?? "0"),
    inning: parseInt(play.inning),
    isTopInning: play.inning_topbot === "Top",
    batter: displayName,
    pitcher: "",
    exitVelocity: play.launch_speed,
    launchAngle: play.launch_angle,
    distance: play.hit_distance_sc,
    wpa: teamWpa,
    xwoba: play.estimated_woba_using_speedangle,
    eventType: play.events || "pitch",
    gameType: play.game_type,
  };
}
