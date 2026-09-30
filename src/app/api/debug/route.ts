import { NextRequest, NextResponse } from "next/server";
import { TEAM_BY_ID } from "@/lib/teams";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const teamId = parseInt(searchParams.get("teamId") ?? "119");
  const year = parseInt(searchParams.get("year") ?? "2023");

  const team = TEAM_BY_ID[teamId];
  if (!team) return NextResponse.json({ error: "bad team" }, { status: 400 });

  const params = new URLSearchParams({
    all: "true", hfTeam: `${team.abbreviation}|`, hfSea: `${year}|`,
    hfGT: "R|", player_type: "batter", type: "details",
    min_pitches: "0", min_results: "0", min_pas: "0",
    sort_col: "pitches", sort_order: "desc",
  });

  const csvRes = await fetch(
    `https://baseballsavant.mlb.com/statcast_search/csv?${params}`,
    { headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0" } }
  );
  const csv = await csvRes.text();
  const lines = csv.trim().split("\n");
  const headers = splitLine(lines[0]);

  // Parse first data row properly
  const row1 = splitLine(lines[1] ?? "");
  const row: Record<string, string> = {};
  headers.forEach((h, i) => { row[h] = row1[i] ?? ""; });

  // Find any columns that look like UUIDs or play identifiers
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidCols: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (uuidPattern.test(v)) uuidCols[k] = v;
  }

  // Find columns with "id" or "play" in the name
  const idCols: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if ((k.includes("id") || k.includes("play")) && v) idCols[k] = v;
  }

  // Test sporty-videos with a UUID from play-by-play
  const gamePk = row["game_pk"];
  let playByPlaySample: unknown = null;
  let sportyVideoTest: unknown = null;

  if (gamePk) {
    const pbpRes = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/playByPlay`);
    const pbp = await pbpRes.json();
    const firstPlay = pbp?.allPlays?.[0];
    const samplePlayId = firstPlay?.playId;
    playByPlaySample = {
      atBatIndex: firstPlay?.about?.atBatIndex,
      playId: samplePlayId,
      event: firstPlay?.result?.eventType,
    };

    if (samplePlayId) {
      const svRes = await fetch(
        `https://baseballsavant.mlb.com/sporty-videos?playId=${samplePlayId}`,
        { headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0", Referer: "https://baseballsavant.mlb.com/" } }
      );
      const svData = await svRes.json().catch(() => null);
      sportyVideoTest = {
        status: svRes.status,
        videoLinks: svData?.videoLinks?.length ?? 0,
        firstUrl: svData?.videoLinks?.[0]?.url?.slice(0, 80) ?? null,
      };
    }
  }

  // Check what game highlights look like for duration/type
  let highlightSample: unknown = null;
  if (gamePk) {
    const contentRes = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/content`);
    const content = await contentRes.json();
    const items = content?.highlights?.highlights?.items ?? [];
    highlightSample = items.slice(0, 5).map((item: Record<string, unknown>) => ({
      headline: item.headline,
      duration: item.duration,
      keywordsDisplay: (item.keywordsDisplay as Array<{ displayName: string }>)?.map(k => k.displayName).join(", "),
    }));
  }

  return NextResponse.json({
    csvColumns: { total: headers.length, uuidColumns: uuidCols, idRelatedColumns: idCols },
    playByPlay: playByPlaySample,
    sportyVideo: sportyVideoTest,
    highlightSamples: highlightSample,
  });
}

function splitLine(line: string): string[] {
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
