/**
 * Manually patches a video URL into a cached recap JSON.
 *
 * Usage:
 *   node scripts/patch-video.mjs --team 147 --year 2025 --playId <uuid> --url <mp4-url>
 *
 * Get the URL by opening this in Firefox:
 *   https://baseballsavant.mlb.com/sporty-videos?playId=<uuid>
 * Copy the url field from inside videoLinks[].
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/recaps");

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) =>
    a.startsWith("--") ? [[a.slice(2), arr[i + 1]]] : []
  )
);

const { team, year, playId, url } = args;

if (!team || !year || !playId || !url) {
  console.error("Usage: node scripts/patch-video.mjs --team <id> --year <year> --playId <uuid> --url <mp4-url>");
  process.exit(1);
}

const cacheFile = path.join(DATA_DIR, `${team}-${year}.json`);
if (!fs.existsSync(cacheFile)) {
  console.error(`Cache file not found: ${cacheFile}`);
  process.exit(1);
}

const recap = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
const clip = recap.clips.find((c) => c.playId === playId);

if (!clip) {
  console.error(`No clip found with playId=${playId}`);
  console.log("Available playIds:", recap.clips.map((c) => c.playId).filter(Boolean));
  process.exit(1);
}

clip.videoUrl = url;
fs.writeFileSync(cacheFile, JSON.stringify(recap, null, 2));
console.log(`Patched "${clip.title}" → ${url.slice(0, 60)}…`);
