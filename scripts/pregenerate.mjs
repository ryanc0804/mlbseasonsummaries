/**
 * Pregenerates season recaps for all 30 teams so users never trigger generation.
 *
 * - Completed seasons (past Dec 1 of that year): generated once, then never touched again.
 * - In-progress seasons: regenerated when the cached copy is older than --stale-hours (default 24).
 *
 * Requires the dev or prod server to be running (it drives the /api/recap endpoint,
 * which handles Savant fetches, Claude narrative, and disk caching).
 *
 * Usage:
 *   node scripts/pregenerate.mjs --year 2025                  # all teams, 2025
 *   node scripts/pregenerate.mjs --year 2026 --stale-hours 12 # refresh current season
 *   node scripts/pregenerate.mjs --year 2025 --team 147       # single team
 *   node scripts/pregenerate.mjs --year 2025 --force          # regenerate even if cached
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/recaps");

const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TEAMS = [
  [110, "Orioles"], [111, "Red Sox"], [147, "Yankees"], [139, "Rays"], [141, "Blue Jays"],
  [145, "White Sox"], [114, "Guardians"], [116, "Tigers"], [118, "Royals"], [142, "Twins"],
  [117, "Astros"], [108, "Angels"], [133, "Athletics"], [136, "Mariners"], [140, "Rangers"],
  [144, "Braves"], [146, "Marlins"], [121, "Mets"], [143, "Phillies"], [120, "Nationals"],
  [112, "Cubs"], [113, "Reds"], [158, "Brewers"], [134, "Pirates"], [138, "Cardinals"],
  [109, "Diamondbacks"], [115, "Rockies"], [119, "Dodgers"], [135, "Padres"], [137, "Giants"],
];

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) =>
    a.startsWith("--") ? [[a.slice(2), arr[i + 1] ?? "true"]] : []
  )
);

const year = parseInt(args.year ?? "");
if (isNaN(year)) {
  console.error("Usage: node scripts/pregenerate.mjs --year <year> [--team <id>] [--stale-hours <n>] [--force] [--base <url>]");
  process.exit(1);
}

const baseUrl = args.base ?? "http://localhost:3000";
const staleHours = parseFloat(args["stale-hours"] ?? "24");
const force = args.force === "true";
const onlyTeam = args.team ? parseInt(args.team) : null;

// A season is considered complete once we're past Dec 1 of that year (postseason over).
const seasonComplete = new Date() > new Date(`${year}-12-01T00:00:00Z`);

function cacheFile(teamId) {
  return path.join(DATA_DIR, `${teamId}-${year}.json`);
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&");
}

function cacheState(teamId) {
  const file = cacheFile(teamId);
  if (!fs.existsSync(file)) return { exists: false };
  try {
    const recap = JSON.parse(fs.readFileSync(file, "utf8"));
    const generatedAt = recap.generatedAt ? new Date(recap.generatedAt) : null;
    const ageHours = generatedAt ? (Date.now() - generatedAt.getTime()) / 36e5 : Infinity;
    return { exists: true, ageHours };
  } catch {
    return { exists: false };
  }
}

async function resolveVideos(teamId, name) {
  const file = cacheFile(teamId);
  if (!fs.existsSync(file)) return;
  const recap = JSON.parse(fs.readFileSync(file, "utf8"));
  // Resolve sporty clips (~30s single-play cuts) for every clip with a playId,
  // replacing longer highlight-package fallbacks; those remain only if sporty fails.
  const pending = recap.clips.filter(
    (c) => c.playId && !(c.videoUrl ?? "").includes("sporty-clips.mlb.com")
  );
  if (pending.length === 0) return;

  let resolved = 0;
  for (const clip of pending) {
    try {
      const res = await fetch(`https://baseballsavant.mlb.com/sporty-videos?playId=${clip.playId}`, {
        headers: { "User-Agent": BROWSER_UA, Referer: "https://baseballsavant.mlb.com/" },
      });
      const html = await res.text();
      const match = html.match(/src="(https:\/\/sporty-clips\.mlb\.com\/[^"]+\.mp4)"/);
      if (match) {
        // Savant HTML-escapes URL attributes (e.g. base64 '==' becomes '&#x3D;&#x3D;')
        clip.videoUrl = decodeHtmlEntities(match[1]);
        resolved++;
      }
    } catch {
      // leave unresolved; player falls back to playId
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (resolved > 0) {
    fs.writeFileSync(file, JSON.stringify(recap, null, 2));
  }
  console.log(`    videos: resolved ${resolved}/${pending.length}`);
}

const teams = onlyTeam ? TEAMS.filter(([id]) => id === onlyTeam) : TEAMS;
console.log(`Pregenerating ${teams.length} team(s) for ${year} (season ${seasonComplete ? "complete" : "IN PROGRESS"})\n`);

let generated = 0, skipped = 0, failed = 0;

for (const [teamId, name] of teams) {
  const state = cacheState(teamId);

  if (state.exists && !force) {
    if (seasonComplete) {
      console.log(`  SKIP ${name} — season complete, recap is permanent`);
      skipped++;
      continue;
    }
    if (state.ageHours < staleHours) {
      console.log(`  SKIP ${name} — fresh (${state.ageHours.toFixed(1)}h old)`);
      skipped++;
      continue;
    }
  }

  // Stale or missing: remove old cache so the API regenerates
  if (state.exists) fs.rmSync(cacheFile(teamId));

  process.stdout.write(`  GEN  ${name} … `);
  // Savant throws transient 5xx errors under load — retry a couple of times
  const ATTEMPTS = 3;
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/api/recap?teamId=${teamId}&year=${year}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      console.log(attempt > 1 ? `ok (attempt ${attempt})` : "ok");
      await resolveVideos(teamId, name);
      generated++;
      lastError = null;
      break;
    } catch (e) {
      lastError = e;
      if (attempt < ATTEMPTS) {
        process.stdout.write(`retry ${attempt} (${e.message}) … `);
        await new Promise((r) => setTimeout(r, 30_000));
      }
    }
  }
  if (lastError) {
    console.log(`FAILED — ${lastError.message}`);
    failed++;
  }
}

console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
