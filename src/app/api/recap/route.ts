import { NextRequest, NextResponse } from "next/server";
import { fetchTopClips, fetchSeasonStats } from "@/lib/savant";
import { generateNarrative } from "@/lib/narrative";
import { loadCachedRecap, saveRecapToCache } from "@/lib/cache";
import { TEAM_BY_ID } from "@/lib/teams";
import type { RecapData } from "@/lib/types";

export const maxDuration = 60;

// In-flight dedup: if two requests for the same team/year arrive simultaneously,
// only run the generation once and share the result.
const inFlight = new Map<string, Promise<RecapData>>();

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const teamId = parseInt(searchParams.get("teamId") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");

  if (isNaN(teamId) || isNaN(year)) {
    return NextResponse.json({ error: "teamId and year are required" }, { status: 400 });
  }
  if (!TEAM_BY_ID[teamId]) {
    return NextResponse.json({ error: "Unknown team" }, { status: 404 });
  }
  if (year < 2015 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: "Year out of range (2015–present)" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Disk cache hit — instant return
  const cached = loadCachedRecap(teamId, year);
  if (cached) {
    console.log(`[recap] Cache hit: ${teamId}/${year}`);
    return NextResponse.json(cached);
  }

  const key = `${teamId}-${year}`;

  try {
    // If a generation is already in flight for this key, await the same promise
    if (!inFlight.has(key)) {
      const promise = generate(teamId, year).finally(() => inFlight.delete(key));
      inFlight.set(key, promise);
    }

    const recap = await inFlight.get(key)!;
    return NextResponse.json(recap);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[recap API] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generate(teamId: number, year: number): Promise<RecapData> {
  const [clips, seasonStats] = await Promise.all([
    fetchTopClips(teamId, year),
    fetchSeasonStats(teamId, year),
  ]);

  if (clips.length === 0) {
    throw new Error(
      "No play data found — Baseball Savant may not have Statcast data for this team/season (available from ~2017 onward)."
    );
  }

  const { narrative, chapters, orderedClips } = await generateNarrative(
    clips, seasonStats, teamId, year
  );

  const recap: RecapData = { teamId, year, narrative, chapters, clips: orderedClips, seasonStats };
  saveRecapToCache(recap);
  return recap;
}
