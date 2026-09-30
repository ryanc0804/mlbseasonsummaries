"use client";

import type { Clip, Chapter } from "@/lib/types";
import type { MLBTeam } from "@/lib/teams";

interface ChapterSidebarProps {
  chapters: Chapter[];
  clips: Clip[];
  team: MLBTeam;
  currentClipIndex: number;
  onSelectClip: (index: number) => void;
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

export function ChapterSidebar({
  chapters,
  clips,
  team,
  currentClipIndex,
  onSelectClip,
}: ChapterSidebarProps) {
  // Determine which chapter the current clip belongs to
  const activeChapterIndex = chapters.findIndex(
    (ch) => currentClipIndex >= ch.startClipIndex && currentClipIndex <= ch.endClipIndex
  );

  return (
    <div className="w-72 flex-shrink-0 border-l border-white/10 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30">
          Chapters
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chapters.map((chapter, ci) => {
          const isActiveChapter = ci === activeChapterIndex;
          const toneColor = TONE_COLORS[chapter.tone];
          const chapterClips = clips.slice(chapter.startClipIndex, chapter.endClipIndex + 1);

          return (
            <div key={chapter.id} className="border-b border-white/5">
              {/* Chapter header — click to jump to first clip */}
              <button
                onClick={() => onSelectClip(chapter.startClipIndex)}
                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                style={isActiveChapter ? { backgroundColor: toneColor + "0d" } : {}}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ backgroundColor: toneColor + "25", color: toneColor }}
                  >
                    {TONE_LABELS[chapter.tone]}
                  </span>
                  {isActiveChapter && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                  )}
                </div>
                <p
                  className="text-sm font-semibold leading-snug"
                  style={isActiveChapter ? { color: "#fff" } : { color: "rgba(255,255,255,0.6)" }}
                >
                  {chapter.title}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5 leading-snug">
                  {chapter.description}
                </p>
              </button>

              {/* Clip list within chapter */}
              <div className="pb-1">
                {chapterClips.map((clip, i) => {
                  const clipIndex = chapter.startClipIndex + i;
                  const isActive = clipIndex === currentClipIndex;
                  return (
                    <button
                      key={clip.id}
                      onClick={() => onSelectClip(clipIndex)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors"
                      style={isActive ? { backgroundColor: team.primaryColor + "15" } : {}}
                    >
                      {/* Thumbnail or number */}
                      <div
                        className="w-10 h-7 rounded overflow-hidden flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                        style={{ backgroundColor: team.primaryColor + "20", color: team.primaryColor }}
                      >
                        {clip.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          clipIndex + 1
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <p
                          className="text-xs leading-snug truncate"
                          style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.55)" }}
                        >
                          {clip.title}
                        </p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          {formatDate(clip.date)}
                          {clip.wpa !== undefined && (
                            <span
                              className="ml-1.5"
                              style={{ color: clip.wpa >= 0 ? team.primaryColor : "#f87171" }}
                            >
                              {clip.wpa >= 0 ? "+" : ""}{(clip.wpa * 100).toFixed(0)}%
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: team.primaryColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Download button */}
      <div className="border-t border-white/10 px-4 py-3 flex-shrink-0">
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
