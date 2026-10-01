/**
 * Regenerates recaps that predate a code/prompt improvement, plus any missing
 * team-years, then pushes per season so the live site picks them up.
 *
 * Usage:
 *   node scripts/backfill-stale.mjs --cutoff 2026-10-01T00:09:19Z [--years 2017-2026]
 *
 * A recap is redone if its generatedAt is older than --cutoff; a team-year with
 * no cache file at all is generated fresh. Needs the dev/prod server running.
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "recaps");

const TEAM_IDS = [110,111,147,139,141,145,114,116,118,142,117,108,133,136,140,144,146,121,143,120,112,113,158,134,138,109,115,119,135,137];

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => (a.startsWith("--") ? [[a.slice(2), arr[i + 1] ?? "true"]] : []))
);

const cutoff = new Date(args.cutoff ?? "");
if (isNaN(cutoff.getTime())) {
  console.error("Usage: node scripts/backfill-stale.mjs --cutoff <ISO timestamp> [--years 2017-2026]");
  process.exit(1);
}
const [yFrom, yTo] = (args.years ?? "2017-2026").split("-").map(Number);

function git(...a) {
  try { return execFileSync("git", a, { cwd: ROOT, stdio: "pipe" }).toString(); }
  catch (e) { console.error("git", a.join(" "), "failed:", e.message); return null; }
}

for (let year = yTo; year >= yFrom; year--) {
  const todo = [];
  for (const teamId of TEAM_IDS) {
    const file = path.join(DATA_DIR, `${teamId}-${year}.json`);
    if (!fs.existsSync(file)) { todo.push([teamId, "missing"]); continue; }
    try {
      const gen = new Date(JSON.parse(fs.readFileSync(file, "utf8")).generatedAt ?? 0);
      if (gen < cutoff) todo.push([teamId, "stale"]);
    } catch { todo.push([teamId, "unreadable"]); }
  }

  if (todo.length === 0) { console.log(`${year}: all fresh`); continue; }
  console.log(`${year}: ${todo.length} to redo (${todo.filter(t=>t[1]==="missing").length} missing)`);

  for (const [teamId, why] of todo) {
    console.log(`  ${year}/${teamId} (${why})`);
    try {
      execFileSync("node", ["scripts/pregenerate.mjs", "--year", String(year), "--team", String(teamId), "--force"],
        { cwd: ROOT, stdio: "inherit" });
    } catch { /* pregenerate logs its own failures; keep going */ }
  }

  if (git("status", "--porcelain", "data/recaps")?.trim()) {
    git("add", "data/recaps");
    git("commit", "-m", `Recaps: ${year} backfill`);
    git("push", "origin", "main");
    console.log(`PUSHED ${year}`);
  }
}
console.log("BACKFILL COMPLETE");
