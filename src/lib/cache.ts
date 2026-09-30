import fs from "fs";
import path from "path";
import type { RecapData } from "@/lib/types";

const CACHE_DIR = path.join(process.cwd(), "data", "recaps");

function cacheFile(teamId: number, year: number): string {
  return path.join(CACHE_DIR, `${teamId}-${year}.json`);
}

export function loadCachedRecap(teamId: number, year: number): RecapData | null {
  const file = cacheFile(teamId, year);
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as RecapData;
  } catch {
    return null;
  }
}

export function saveRecapToCache(recap: RecapData): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(
      cacheFile(recap.teamId, recap.year),
      JSON.stringify({ ...recap, generatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("[cache] Failed to save recap:", err);
  }
}

export function listCachedRecaps(): Array<{ teamId: number; year: number }> {
  try {
    if (!fs.existsSync(CACHE_DIR)) return [];
    return fs
      .readdirSync(CACHE_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const [teamId, year] = f.replace(".json", "").split("-").map(Number);
        return { teamId, year };
      })
      .filter((r) => !isNaN(r.teamId) && !isNaN(r.year));
  } catch {
    return [];
  }
}
