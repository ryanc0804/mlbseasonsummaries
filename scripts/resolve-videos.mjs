/**
 * Resolves sporty-video URLs for clips that have a playId but no videoUrl,
 * then patches them directly into the cached recap JSON.
 *
 * Usage:
 *   node scripts/resolve-videos.mjs --team 147 --year 2025
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/recaps");

const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) =>
    a.startsWith("--") ? [[a.slice(2), arr[i + 1]]] : []
  )
);
const teamId = args.team;
const year = args.year;

if (!teamId || !year) {
  console.error("Usage: node scripts/resolve-videos.mjs --team <id> --year <year>");
  process.exit(1);
}

const cacheFile = path.join(DATA_DIR, `${teamId}-${year}.json`);
if (!fs.existsSync(cacheFile)) {
  console.error(`Cache file not found: ${cacheFile}`);
  console.error("Load the team recap page first to generate the cache, then run this script.");
  process.exit(1);
}

const recap = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
const pending = recap.clips.filter((c) => c.playId && !c.videoUrl);

if (pending.length === 0) {
  console.log("All clips already have video URLs. Nothing to do.");
  process.exit(0);
}

console.log(`Found ${pending.length} clips needing video URLs.`);

let resolved = 0;
let failed = 0;

for (const clip of pending) {
  const url = `https://baseballsavant.mlb.com/sporty-videos?playId=${clip.playId}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Referer": "https://baseballsavant.mlb.com/",
      },
    });
    const html = await res.text();
    const match = html.match(/src="(https:\/\/sporty-clips\.mlb\.com\/[^"]+\.mp4)"/);
    if (match) {
      clip.videoUrl = match[1];
      console.log(`  OK   ${clip.title}`);
      resolved++;
    } else {
      console.log(`  FAIL ${clip.title} — video URL not found in page`);
      failed++;
    }
  } catch (e) {
    console.log(`  ERR  ${clip.title} — ${e.message}`);
    failed++;
  }

  await new Promise((r) => setTimeout(r, 300));
}

console.log(`\nResolved ${resolved}/${pending.length} (${failed} failed)`);

if (resolved > 0) {
  fs.writeFileSync(cacheFile, JSON.stringify(recap, null, 2));
  console.log(`Saved → ${cacheFile}`);
}
