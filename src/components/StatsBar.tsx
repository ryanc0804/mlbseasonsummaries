"use client";

import type { SeasonStats } from "@/lib/types";
import type { MLBTeam } from "@/lib/teams";

interface StatsBarProps {
  stats: SeasonStats;
  team: MLBTeam;
}

export function StatsBar({ stats, team }: StatsBarProps) {
  const record = `${stats.wins}-${stats.losses}`;
  const winPct = (stats.wins / (stats.wins + stats.losses)).toFixed(3).replace("0.", ".");

  const items = [
    { label: "Record", value: record },
    { label: "Win %", value: winPct },
    { label: "RS", value: stats.runsScored.toString() },
    { label: "RA", value: stats.runsAllowed.toString() },
    { label: "HR", value: stats.homeRuns.toString() },
    { label: "ERA", value: stats.teamEra.toFixed(2) },
    { label: "AVG", value: stats.teamAvg.toFixed(3).replace("0.", ".") },
    { label: "OPS", value: stats.teamOps.toFixed(3).replace("0.", ".") },
  ];

  return (
    <div className="border-t border-white/10 px-4 py-3 overflow-x-auto">
      <div className="flex items-center gap-6 min-w-max">
        {stats.playoffResult && (
          <div
            className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: team.primaryColor + "30", color: team.primaryColor }}
          >
            {stats.playoffResult}
          </div>
        )}
        {items.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-white/30 uppercase tracking-wide">{label}</span>
            <span className="text-sm font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
