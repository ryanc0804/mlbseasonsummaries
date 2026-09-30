"use client";

import { useState } from "react";
import type { Clip, Chapter } from "@/lib/types";
import type { MLBTeam } from "@/lib/teams";

interface NarrativePanelProps {
  narrative: string;
  chapters: Chapter[];
  clips: Clip[];
  team: MLBTeam;
}

const TONE_COLORS: Record<Chapter["tone"], string> = {
  triumph: "#22c55e",
  struggle: "#ef4444",
  turning_point: "#f59e0b",
  clutch: "#3b82f6",
  milestone: "#a855f7",
};

const TONE_LABELS: Record<Chapter["tone"], string> = {
  triumph: "Triumph",
  struggle: "Struggle",
  turning_point: "Turning Point",
  clutch: "Clutch",
  milestone: "Milestone",
};

export function NarrativePanel({ narrative, chapters, clips, team }: NarrativePanelProps) {
  const [tab, setTab] = useState<"story" | "chapters">("story");

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <TabButton active={tab === "story"} onClick={() => setTab("story")} color={team.primaryColor}>
          AI Story
        </TabButton>
        <TabButton active={tab === "chapters"} onClick={() => setTab("chapters")} color={team.primaryColor}>
          Chapters ({chapters.length})
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "story" && (
          <div className="px-5 py-5 space-y-4 text-sm text-white/80 leading-relaxed">
            {narrative.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {tab === "chapters" && (
          <div className="px-4 py-4 space-y-3">
            {chapters.map((chapter, ci) => {
              const chapterClips = clips.slice(chapter.startClipIndex, chapter.endClipIndex + 1);
              const toneColor = TONE_COLORS[chapter.tone];
              return (
                <div
                  key={chapter.id}
                  className="rounded-xl border border-white/10 overflow-hidden bg-white/3"
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span
                      className="mt-0.5 flex-shrink-0 text-[10px] font-semibold rounded px-1.5 py-0.5"
                      style={{ backgroundColor: toneColor + "20", color: toneColor }}
                    >
                      {TONE_LABELS[chapter.tone]}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm">{chapter.title}</h4>
                      <p className="text-xs text-white/50 mt-0.5">{chapter.description}</p>
                    </div>
                  </div>
                  {/* Clip list for this chapter */}
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {chapterClips.map((clip, i) => (
                      <div key={clip.id} className="px-4 py-2 flex items-center gap-3 text-xs">
                        <span className="text-white/20 w-4 text-right flex-shrink-0">
                          {chapter.startClipIndex + i + 1}
                        </span>
                        <span className="flex-1 text-white/60 truncate">{clip.title}</span>
                        <span className="text-white/30 flex-shrink-0">{formatDate(clip.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Download footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <button
          className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: team.primaryColor }}
          onClick={() => alert("Video compilation coming soon!")}
        >
          Download Compiled Video
        </button>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 text-sm font-medium transition-colors border-b-2"
      style={{
        borderBottomColor: active ? color : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.4)",
      }}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
