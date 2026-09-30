"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { Clip } from "@/lib/types";
import type { MLBTeam } from "@/lib/teams";

interface ClipPlayerProps {
  clips: Clip[];
  team: MLBTeam;
  currentIndex: number;
  onSelectClip: (index: number) => void;
}

export function ClipPlayer({ clips, team, currentIndex, onSelectClip }: ClipPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // resolvedUrls: map from playId → fetched video URL (client-side sporty-videos)
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const clip = clips[currentIndex];
  // Pregenerated recaps ship with videoUrl already resolved — use it directly.
  // resolvedUrls only fills gaps for clips the pregeneration couldn't resolve.
  const videoUrl = clip?.videoUrl ?? (clip?.playId ? resolvedUrls[clip.playId] : undefined);
  const videoFailed = !videoUrl && !!clip?.playId && failedIds.has(clip.playId);

  // Preload the next clip's video while the current one plays, so auto-advance is instant
  const nextClip = clips[currentIndex + 1];
  const nextVideoUrl = nextClip?.videoUrl ?? (nextClip?.playId ? resolvedUrls[nextClip.playId] : undefined);

  const prev = useCallback(() => onSelectClip(Math.max(0, currentIndex - 1)), [currentIndex, onSelectClip]);
  const next = useCallback(() => onSelectClip(Math.min(clips.length - 1, currentIndex + 1)), [currentIndex, clips.length, onSelectClip]);

  // Resolve video URLs only for clips the pregenerated cache is missing them for.
  // Sequential with 300ms delay to avoid Cloudflare rate limiting.
  useEffect(() => {
    let cancelled = false;
    const clipsNeedingVideo = clips.filter((c) => c.playId && !c.videoUrl);
    if (clipsNeedingVideo.length === 0) return;

    (async () => {
      for (const c of clipsNeedingVideo) {
        if (cancelled) break;
        const playId = c.playId!;
        try {
          const data = await fetch(`/api/sporty-video?playId=${playId}`).then((r) => r.json());
          if (data?.videoUrl && !cancelled) {
            setResolvedUrls((prev) => ({ ...prev, [playId]: data.videoUrl }));
          } else if (!cancelled && !c.videoUrl) {
            // Only mark failed if there's no highlight fallback
            setFailedIds((prev) => new Set(prev).add(playId));
          }
        } catch { /* skip this clip */ }
        if (!cancelled) await new Promise((r) => setTimeout(r, 300));
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips]);

  // Load and play whenever clip or its resolved URL changes
useEffect(() => {                                                                                                                                                       
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    video.load();
    video.play().catch(() => {});
  }, [currentIndex, videoUrl]);

  function handleEnded() {
    if (currentIndex < clips.length - 1) next();
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    video.paused ? video.play() : video.pause();
  }

  if (!clip) return null;

  return (
    <div className="flex flex-col">
      {/* Video — height capped so wide screens don't push everything below the fold */}
      <div className="relative bg-black aspect-video max-h-[70vh] w-full">
        {videoUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={videoUrl}
            poster={clip.thumbnailUrl}
            preload="auto"
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            playsInline
          />
        ) : clip.playId && !videoFailed ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/20">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 animate-spin" style={{ borderTopColor: team.primaryColor }} />
            <span className="text-xs">Loading video…</span>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-xs">Video unavailable</span>
          </div>
        )}

        {/* Play/pause overlay — always visible when paused, hover-only when playing */}
        {videoUrl && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${
                isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
              }`}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </div>
          </button>
        )}

        {/* Invisible preloader for the next clip */}
        {nextVideoUrl && (
          <video src={nextVideoUrl} preload="auto" muted playsInline className="hidden" />
        )}

        {/* Clip counter */}
        <div className="absolute top-3 right-3 bg-black/60 rounded-full px-2.5 py-1 text-xs text-white/60 pointer-events-none">
          {currentIndex + 1} / {clips.length}
        </div>

        {/* Nav arrows */}
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-20 hover:bg-black/80 transition-colors"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={next}
          disabled={currentIndex === clips.length - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center disabled:opacity-20 hover:bg-black/80 transition-colors"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Clip info */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug">{clip.title}</h3>
          <WPABadge wpa={clip.wpa} />
        </div>
        <p className="text-xs text-white/50 mt-1">{clip.description}</p>
        <div className="flex items-center gap-3 text-[10px] text-white/30 mt-1.5">
          <span>{formatDate(clip.date)}</span>
          <span>Inning {clip.inning}</span>
          {clip.exitVelocity && <span>{clip.exitVelocity} mph EV</span>}
          {clip.distance && <span>{clip.distance} ft</span>}
        </div>
      </div>

    </div>
  );
}

function WPABadge({ wpa }: { wpa: number }) {
  const isPositive = wpa >= 0;
  return (
    <span
      className="flex-shrink-0 text-[10px] font-mono rounded px-1.5 py-0.5"
      style={{
        backgroundColor: isPositive ? "#22c55e20" : "#ef444420",
        color: isPositive ? "#4ade80" : "#f87171",
      }}
    >
      {isPositive ? "+" : ""}{(wpa * 100).toFixed(1)}% WPA
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PlayIcon() {
  return (
    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
