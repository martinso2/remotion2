"use client";

import { useCallback, useRef, useState } from "react";

function reorderArray<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}
import { Player, PlayerRef } from "@remotion/player";
import {
  calculateImageGalleryDuration,
  FADE_DURATION_FRAMES,
} from "./remotion/ImageGalleryWithAudio";

const VIDEO_FPS = 30;

type DurationOption = "music" | "60" | "90" | "120";
const DURATION_OPTIONS: { id: DurationOption; label: string; seconds: number }[] = [
  { id: "music", label: "Match music", seconds: 0 },
  { id: "60", label: "1:00", seconds: 60 },
  { id: "90", label: "1:30", seconds: 90 },
  { id: "120", label: "2:00", seconds: 120 },
];

type Platform = "tiktok" | "fb-square" | "fb-video";

const PLATFORMS: { id: Platform; label: string; width: number; height: number }[] =
  [
    { id: "tiktok", label: "TikTok", width: 1080, height: 1920 },
    { id: "fb-square", label: "FB Square", width: 1080, height: 1080 },
    { id: "fb-video", label: "FB Video", width: 1920, height: 1080 },
  ];

const IMAGE_POSITIONS = [
  { value: "top left", label: "Top left" },
  { value: "top center", label: "Top center" },
  { value: "top right", label: "Top right" },
  { value: "center left", label: "Center left" },
  { value: "center center", label: "Center" },
  { value: "center right", label: "Center right" },
  { value: "bottom left", label: "Bottom left" },
  { value: "bottom center", label: "Bottom center" },
  { value: "bottom right", label: "Bottom right" },
] as const;

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio"));
    });
  });
}

export function VideoCreator() {
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicDuration, setMusicDuration] = useState<number>(0);
  const [durationOption, setDurationOption] = useState<DurationOption>("90");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePositions, setImagePositions] = useState<string[]>([]);
  const [showMessage, setShowMessage] = useState(true);
  const [fitToMusic, setFitToMusic] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  const config = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  const handleImagesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const files = Array.from(input?.files ?? []);
      if (files.length === 0) return;
      const urls = files.map((f) => URL.createObjectURL(f));
      setImageUrls((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return urls;
      });
      setImagePositions(Array(files.length).fill("top center"));
      input.value = "";
    },
    []
  );

  const removeImages = useCallback(() => {
    imageUrls.forEach((url) => URL.revokeObjectURL(url));
    setImageUrls([]);
    setImagePositions([]);
  }, [imageUrls]);

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImageUrls((prev) => reorderArray(prev, fromIndex, toIndex));
    setImagePositions((prev) => reorderArray(prev, fromIndex, toIndex));
  }, []);

  const setImagePosition = useCallback((index: number, position: string) => {
    setImagePositions((prev) => {
      const next = [...prev];
      next[index] = position;
      return next;
    });
  }, []);

  const handleMusicChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        if (musicUrl) URL.revokeObjectURL(musicUrl);
        setMusicFile(null);
        setMusicUrl(null);
        setMusicDuration(0);
        setDurationOption("90");
        return;
      }
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      try {
        const duration = await getAudioDuration(file);
        setMusicFile(file);
        setMusicUrl(URL.createObjectURL(file));
        setMusicDuration(duration);
        setDurationOption("music");
      } catch {
        setMusicFile(null);
        setMusicUrl(null);
        setMusicDuration(0);
      }
      e.target.value = "";
    },
    [musicUrl]
  );

  const removeMusic = useCallback(() => {
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setMusicFile(null);
    setMusicUrl(null);
    setMusicDuration(0);
    setFitToMusic(false);
    setDurationOption("90");
  }, [musicUrl]);

  const imageDuration =
    imageUrls.length > 0
      ? calculateImageGalleryDuration(imageUrls.length)
      : 0;

  const durationSeconds =
    durationOption === "music" && musicDuration > 0
      ? musicDuration
      : DURATION_OPTIONS.find((d) => d.id === durationOption)?.seconds ?? 90;
  const textDuration = Math.max(30, Math.ceil(durationSeconds * VIDEO_FPS));

  const musicDurationFrames = Math.ceil(musicDuration * VIDEO_FPS);
  const durationInFrames =
    fitToMusic && musicDuration > 0
      ? musicDurationFrames
      : imageUrls.length > 0
        ? imageDuration
        : textDuration;

  const getImageStartFrame = useCallback(
    (imageIndex: number) => {
      const imageCount = imageUrls.length;
      if (imageCount === 0) return 0;
      const imageDurationFrames =
        (durationInFrames + (imageCount - 1) * FADE_DURATION_FRAMES) /
        imageCount;
      const overlapOffset = imageDurationFrames - FADE_DURATION_FRAMES;
      const startFrame = imageIndex * overlapOffset;
      return Math.round(startFrame + FADE_DURATION_FRAMES);
    },
    [imageUrls.length, durationInFrames]
  );

  const seekToImage = useCallback(
    (imageIndex: number) => {
      playerRef.current?.seekTo(getImageStartFrame(imageIndex));
    },
    [getImageStartFrame]
  );

  const lazyComponent = useCallback(
    () =>
      import("./remotion/VideoComposition").then((m) => ({
        default: m.VideoComposition,
      })),
    []
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full min-h-[calc(100vh-8rem)]">
      {/* Console */}
      <aside className="lg:w-80 flex-shrink-0 space-y-4">
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Message
          </h2>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={showMessage}
              onChange={(e) => setShowMessage(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-slate-500 focus:ring-slate-500"
            />
            <span className="text-slate-300 text-sm">Show text on screen</span>
          </label>
          {showMessage && (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your video... e.g. A motivational quote about success"
              className="w-full h-24 px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              rows={4}
            />
          )}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Images
          </h2>
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">
                15-frame crossfade between images
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                className="sr-only"
                aria-label="Choose images"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer items-center justify-center rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
              >
                Choose images
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {imageUrls.length > 0
                  ? `${imageUrls.length} image${imageUrls.length !== 1 ? "s" : ""} chosen`
                  : "No images chosen"}
              </span>
              {imageUrls.length > 0 && (
                <button
                  type="button"
                  onClick={removeImages}
                  className="text-slate-500 hover:text-red-400 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Music
          </h2>
          <div className="space-y-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">MP3, WAV, M4A</span>
              <input
                type="file"
                accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/x-m4a"
                onChange={handleMusicChange}
                className="block w-full text-sm text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-700 file:text-white file:text-sm hover:file:bg-slate-600"
              />
            </label>
            {musicFile && (
              <>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={fitToMusic}
                    onChange={(e) => setFitToMusic(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-slate-500 focus:ring-slate-500"
                  />
                  <span className="text-slate-300 text-sm">Fit to music</span>
                  {musicDuration > 0 && (
                    <span className="text-slate-500 text-xs">
                      ({Math.floor(musicDuration / 60)}:
                      {String(Math.floor(musicDuration % 60)).padStart(2, "0")})
                    </span>
                  )}
                </label>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 truncate max-w-[140px]">
                    {musicFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={removeMusic}
                    className="text-slate-500 hover:text-red-400 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Duration
          </h2>
          {fitToMusic && musicDuration > 0 ? (
            <p className="text-sm text-slate-400">
              {(durationInFrames / VIDEO_FPS).toFixed(1)}s (fit to music)
            </p>
          ) : imageUrls.length > 0 ? (
            <p className="text-sm text-slate-400">
              {(durationInFrames / VIDEO_FPS).toFixed(1)}s from images
            </p>
          ) : (
            <div className="space-y-2">
              {DURATION_OPTIONS.filter(
                (d) => d.id !== "music" || (musicFile && musicDuration > 0)
              ).map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="duration"
                    value={d.id}
                    checked={durationOption === d.id}
                    onChange={() => setDurationOption(d.id)}
                    className="w-4 h-4 text-slate-500 focus:ring-slate-500"
                  />
                  <span className="text-slate-300 group-hover:text-white">
                    {d.label}
                  </span>
                  {d.id === "music" && musicDuration > 0 && (
                    <span className="text-slate-500 text-xs">
                      ({Math.floor(musicDuration / 60)}:
                      {String(Math.floor(musicDuration % 60)).padStart(2, "0")})
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Platform
          </h2>
          <div className="space-y-2">
            {PLATFORMS.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="platform"
                  value={p.id}
                  checked={platform === p.id}
                  onChange={() => setPlatform(p.id)}
                  className="w-4 h-4 text-slate-500 focus:ring-slate-500"
                />
                <span className="text-slate-300 group-hover:text-white">
                  {p.label}
                </span>
                <span className="text-slate-500 text-xs">
                  {p.width}×{p.height}
                </span>
              </label>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Preview updates as you type. Render locally with{" "}
          <code className="bg-slate-800 px-1 rounded">npm run render</code>.
        </p>
      </aside>

      {/* Studio */}
      <section className="flex-1 min-w-0">
        <div className="rounded-lg border border-slate-700 bg-slate-900/30 overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Preview</span>
            <span className="text-xs text-slate-500">
              {config.width}×{config.height}
            </span>
          </div>
          <div className="p-4 flex justify-center bg-slate-950/50">
            <Player
              ref={playerRef}
              lazyComponent={lazyComponent}
              inputProps={{
                imageUrls,
                imagePositions: imagePositions.length === imageUrls.length ? imagePositions : imageUrls.map(() => "top center"),
                text: showMessage ? prompt || "Enter a prompt above" : "",
                showMessage,
                audioSrc: musicUrl ?? undefined,
              }}
              durationInFrames={durationInFrames}
              compositionWidth={config.width}
              compositionHeight={config.height}
              fps={VIDEO_FPS}
              controls
              style={{
                width: "100%",
                maxWidth: config.width > config.height ? 640 : 320,
              }}
            />
          </div>

          {imageUrls.length > 0 && (
            <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/30">
              <p className="text-xs text-slate-500 mb-2">
                Timeline — drag to reorder, use dropdown to adjust crop position
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 items-start">
                {imageUrls.map((url, index) => (
                  <div
                    key={url}
                    className="relative flex flex-col items-center flex-shrink-0 gap-1"
                  >
                    {dropTargetIndex === index && draggedIndex !== index && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-14 bg-red-500 rounded-full z-10 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                        aria-hidden
                      />
                    )}
                    <div
                      draggable
                      onDragStart={() => setDraggedIndex(index)}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDropTargetIndex(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropTargetIndex(index);
                      }}
                      onDragLeave={() => {
                        setDropTargetIndex((i) => (i === index ? null : i));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== null && draggedIndex !== index) {
                          reorderImages(draggedIndex, index);
                        }
                        setDraggedIndex(null);
                        setDropTargetIndex(null);
                      }}
                      className={`
                        relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-600 hover:border-slate-500 cursor-grab active:cursor-grabbing
                        transition-all duration-150
                        ${draggedIndex === index ? "opacity-50 scale-95" : ""}
                      `}
                    >
                      <img
                        src={url}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                        draggable={false}
                      />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5">
                        {index + 1}
                      </span>
                    </div>
                    <select
                      value={imagePositions[index] ?? "top center"}
                      onChange={(e) => setImagePosition(index, e.target.value)}
                      onFocus={() => seekToImage(index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        seekToImage(index);
                      }}
                      className="w-full min-w-0 max-w-[90px] rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-[10px] text-slate-300 focus:border-slate-500 focus:outline-none"
                    >
                      {IMAGE_POSITIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
