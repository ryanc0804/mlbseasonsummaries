import Anthropic from "@anthropic-ai/sdk";
import type { Clip, Chapter, SeasonStats } from "@/lib/types";
import { TEAM_BY_ID } from "@/lib/teams";

const client = new Anthropic();

interface NarrativeResult {
  narrative: string;
  chapters: Chapter[];
  orderedClips: Clip[];
}

export async function generateNarrative(
  clips: Clip[],
  stats: SeasonStats,
  teamId: number,
  year: number,
  monthlyRecords?: string
): Promise<NarrativeResult> {
  const team = TEAM_BY_ID[teamId];

  const GAME_STAGE: Record<string, string> = {
    R: "Regular Season",
    F: "Wild Card",
    D: "Division Series",
    L: "Championship Series",
    W: "World Series",
  };

  // Present clips in true game order — date, then game, then at-bat within the game —
  // so indices follow the season timeline and chapters become consecutive slices.
  const timeline = [...clips].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.gamePk - b.gamePk ||
      (a.atBatNumber ?? 0) - (b.atBatNumber ?? 0)
  );

  const clipsJson = timeline.map((c, i) => ({
    index: i,
    title: c.title,
    date: c.date,
    stage: GAME_STAGE[c.gameType ?? "R"] ?? "Regular Season",
    eventType: c.eventType,
    // WPA is already sign-adjusted: positive = helped the team, negative = hurt the team
    wpa: c.wpa.toFixed(3),
    impact: c.wpa >= 0 ? "helped team" : "hurt team",
    batter: c.batter,
    description: c.description.slice(0, 120),
  }));

  const systemPrompt = `You are an expert baseball analyst and storyteller. Your job is to look at a season's most impactful plays (by Win Probability Added) and craft a compelling narrative of how the season unfolded. Respond with valid JSON only — no text before or after the JSON object.`;

  // Seasons aren't final until the postseason wraps (~Dec 1)
  const seasonInProgress = new Date() < new Date(`${year}-12-01T00:00:00Z`);

  const userPrompt = `Team: ${team.city} ${team.name}
Season: ${year}${seasonInProgress ? " (SEASON STILL IN PROGRESS — anything ongoing, especially the postseason, must be written in present tense with no final outcomes declared)" : ""}
Record: ${stats.wins}-${stats.losses}
Runs: ${stats.runsScored} scored, ${stats.runsAllowed} allowed
Home runs: ${stats.homeRuns} | ERA: ${stats.teamEra} | OPS: ${stats.teamOps}
${stats.playoffResult ? `Postseason: ${stats.playoffResult}` : "Missed playoffs"}
${monthlyRecords ? `Month-by-month record: ${monthlyRecords}` : ""}

The season's top plays in chronological order (WPA already adjusted for team perspective — positive = helped ${team.name}, negative = hurt ${team.name}):
${JSON.stringify(clipsJson, null, 2)}

Every clip above will be shown, in this exact order. Your job is to divide the timeline into chapters — consecutive eras of the season — by choosing where each chapter begins.

Return a JSON object with exactly this shape:
{
  "narrative": "3-4 paragraphs of plain text separated by \\n\\n describing the season arc",
  "chapters": [
    {
      "id": "ch1",
      "title": "short chapter title",
      "description": "one sentence",
      "startIndex": 0,
      "tone": "triumph"
    }
  ]
}

Requirements:
- 3 to 6 chapters total
- Each chapter's startIndex is the index of the first clip in that era; the chapter runs until the next chapter begins (the last chapter runs to the end)
- The first chapter must have startIndex 0, and startIndex must be strictly increasing across chapters
- Place boundaries where the story actually turns (a slump begins, a streak ignites, the postseason starts)
- IMPORTANT: the clips are the season's highest-leverage plays, which skews toward dramatic losses — a stretch can look bleak in clips even when the team was winning. Judge each era by the month-by-month record first; title a winning stretch as winning (e.g. "Winning Ugly") even if its biggest moments were painful, and reserve collapse/slump framing for stretches where the record actually fell apart
- If any clips have a postseason stage (Wild Card, Division Series, Championship Series, World Series), the final chapter must begin at the first postseason clip and cover the playoff run, and the narrative must tell the October story
- tone must be one of: triumph, struggle, turning_point, clutch, milestone
- narrative must be plain text only (no markdown)`;

  console.log("[narrative] Calling Claude with", clips.length, "clips…");

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = message.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
  console.log("[narrative] Raw response length:", raw.length, "chars");
  console.log("[narrative] First 200 chars:", raw.slice(0, 200));

  // Extract JSON — handle code fences, leading/trailing text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Claude did not return JSON. Response: ${raw.slice(0, 300)}`);

  let result: {
    narrative: string;
    chapters: Array<{
      id: string;
      title: string;
      description: string;
      startIndex: number;
      tone: Chapter["tone"];
    }>;
  };

  try {
    result = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Failed to parse Claude JSON: ${e}. Raw: ${jsonMatch[0].slice(0, 300)}`);
  }

  if (!result.narrative || !Array.isArray(result.chapters)) {
    throw new Error(`Claude response missing required fields. Got: ${JSON.stringify(result).slice(0, 300)}`);
  }

  // Chapters are boundaries over the date-sorted timeline: every clip is shown, in
  // chronological order, and each chapter covers the stretch up to the next one.
  // Sanitize Claude's boundaries: valid, unique, ascending, first one forced to 0.
  const boundaries = [
    ...new Set(
      result.chapters
        .map((ch) => (typeof ch.startIndex === "number" ? Math.floor(ch.startIndex) : -1))
        .filter((i) => i >= 0 && i < timeline.length)
    ),
  ].sort((a, b) => a - b);
  if (boundaries.length === 0 || boundaries[0] !== 0) boundaries.unshift(0);

  const sortedChapters = [...result.chapters].sort(
    (a, b) => (a.startIndex ?? 0) - (b.startIndex ?? 0)
  );

  const chapters: Chapter[] = boundaries.map((start, i) => {
    const ch = sortedChapters[i] ?? {};
    return {
      id: ch.id ?? `ch-${i}`,
      title: ch.title ?? "Chapter",
      description: ch.description ?? "",
      startClipIndex: start,
      endClipIndex: (boundaries[i + 1] ?? timeline.length) - 1,
      tone: ch.tone ?? "triumph",
    };
  });

  console.log(`[narrative] Built ${chapters.length} chapters over ${timeline.length} clips`);
  return { narrative: result.narrative, chapters, orderedClips: timeline };
}
