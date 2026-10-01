"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DIVISIONS, type MLBTeam } from "@/lib/teams";

export default function HomePage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  // Default to the current season (before April, that's still last year's)
  const currentSeason = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  const [selectedTeam, setSelectedTeam] = useState<MLBTeam | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentSeason);

  function handleGenerate() {
    if (!selectedTeam) return;
    router.push(`/recap/${selectedTeam.id}/${selectedYear}`);
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12 md:py-20">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
          MLB Season
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-400">
            Rewind
          </span>
        </h1>
        <p className="text-white/50 text-lg max-w-md mx-auto">
          Pick a team and year. Relive the biggest moments of the season,
          told as one story.
        </p>
      </div>

      {/* Team picker */}
      <div className="w-full max-w-4xl space-y-8">
        {(["AL", "NL"] as const).map((league) => (
          <div key={league}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
              {league === "AL" ? "American League" : "National League"}
            </h2>
            <div className="space-y-3">
              {(["East", "Central", "West"] as const).map((div) => (
                <div key={div}>
                  <p className="text-xs text-white/20 mb-2 ml-1">{div}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {DIVISIONS[league][div].map((team) => {
                      const isSelected = selectedTeam?.id === team.id;
                      return (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeam(team)}
                          style={
                            isSelected
                              ? {
                                  borderColor: team.primaryColor,
                                  backgroundColor: team.primaryColor + "20",
                                }
                              : {}
                          }
                          className={`
                            relative flex flex-col items-center justify-center gap-1.5
                            rounded-xl border p-3 transition-all duration-150
                            ${
                              isSelected
                                ? "border-current scale-105 shadow-lg"
                                : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                            }
                          `}
                        >
                          <img
                            src={team.logoUrl}
                            alt={team.name}
                            className="w-10 h-10 object-contain"
                          />
                          <span className="text-[10px] text-white/60 text-center leading-tight">
                            {team.city}
                            <br />
                            <span className="text-white/90 font-medium">{team.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Year + Generate */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <label className="text-sm text-white/50 whitespace-nowrap">Season</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#0d1117]">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {selectedTeam && (
            <div className="text-sm text-white/40">
              {selectedTeam.city} {selectedTeam.name} &mdash; {selectedYear}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={selectedTeam === null}
            style={selectedTeam ? { backgroundColor: selectedTeam.primaryColor } : {}}
            className={`
              ml-auto px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150
              ${
                selectedTeam
                  ? "text-white hover:opacity-90 active:scale-95"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }
            `}
          >
            View Recap →
          </button>
        </div>
      </div>
    </main>
  );
}
