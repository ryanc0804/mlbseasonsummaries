"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { TEAM_BY_ID } from "@/lib/teams";
import { ClipPlayer } from "@/components/ClipPlayer";
import { ChapterSidebar } from "@/components/ChapterSidebar";
import { StatsBar } from "@/components/StatsBar";
import type { RecapData } from "@/lib/types";

export default function RecapPage({
  params,
}: {
  params: Promise<{ teamId: string; year: string }>;
}) {
  const { teamId, year } = use(params);
  const team = TEAM_BY_ID[Number(teamId)];

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);

  useEffect(() => {
    if (!team) return;
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/recap?teamId=${teamId}&year=${year}`, { signal: controller.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? `HTTP ${r.status}`);
        return body;
      })
      .then((data: RecapData) => {
        setRecap(data);
        setCurrentClipIndex(0);
        setStatus("done");
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return; // StrictMode cleanup — ignore
        setError(e.message);
        setStatus("error");
      });
    return () => controller.abort();
  }, [teamId, year, team]);

  if (!team) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-white/40">Team not found.</p>
      </main>
    );
  }

  return (
    <main className="h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="border-b border-white/10 px-6 py-4 flex items-center gap-4 flex-shrink-0"
        style={{ borderBottomColor: team.primaryColor + "40" }}
      >
        <Link href="/" className="text-white/30 hover:text-white/60 text-sm transition-colors">
          ← Back
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={team.logoUrl}
          alt={team.name}
          className="w-8 h-8 object-contain flex-shrink-0"
        />
        <div>
          <h1 className="font-semibold">{team.city} {team.name}</h1>
          <p className="text-xs text-white/40">{year} Season Recap</p>
        </div>
      </header>

      {status === "loading" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <LoadingSpinner color={team.primaryColor} />
          <p className="text-white/40 text-sm">Pulling moments from Baseball Savant…</p>
          <p className="text-white/20 text-xs">Generating AI narrative</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-red-400">Failed to load recap</p>
            <p className="text-white/30 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-sm bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {status === "done" && recap && (
        <div className="flex-1 flex overflow-hidden">
          {/* Main column: video + stats + narrative */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <ClipPlayer
              clips={recap.clips}
              team={team}
              currentIndex={currentClipIndex}
              onSelectClip={setCurrentClipIndex}
            />
            <StatsBar stats={recap.seasonStats} team={team} />

            {/* AI Narrative — two columns on wide screens so the width gets used */}
            <div className="px-6 py-6 border-t border-white/10">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
                AI Season Summary
              </h2>
              <div className="max-w-3xl xl:max-w-6xl xl:columns-2 xl:gap-12">
                {recap.narrative.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm text-white/70 leading-relaxed mb-4 break-inside-avoid">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Chapter sidebar */}
          <ChapterSidebar
            chapters={recap.chapters}
            clips={recap.clips}
            team={team}
            currentClipIndex={currentClipIndex}
            onSelectClip={setCurrentClipIndex}
          />
        </div>
      )}
    </main>
  );
}

function LoadingSpinner({ color }: { color: string }) {
  return (
    <div
      className="w-12 h-12 rounded-full border-2 border-white/10 animate-spin"
      style={{ borderTopColor: color }}
    />
  );
}
