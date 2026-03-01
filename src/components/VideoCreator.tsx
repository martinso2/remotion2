"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import { Player, PlayerRef } from "@remotion/player";
import { VideoComposition } from "./remotion/VideoComposition";

function reorderArray<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}
import {
  type MediaItem,
  calculateMediaGalleryDuration,
  IMAGE_DURATION_FRAMES,
} from "./remotion/MediaGalleryWithAudio";
import { InlineMediaEditor } from "./InlineMediaEditor";

const VIDEO_FPS = 30;
const END_TAIL_SECONDS = 5;

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
    { id: "tiktok", label: "Vertical Video", width: 1080, height: 1920 },
    { id: "fb-square", label: "Square", width: 1080, height: 1080 },
    { id: "fb-video", label: "Horizontal Video", width: 1920, height: 1080 },
  ];

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

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    });
    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
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
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaTransforms, setMediaTransforms] = useState<Array<{ position: string; scale: number }>>([]);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [fitToMusic, setFitToMusic] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<{ title: string }[]>([]);
  const [selectedProjectToLoad, setSelectedProjectToLoad] = useState("");
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [loadedMusicFileName, setLoadedMusicFileName] = useState<string | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videoLoadProgress, setVideoLoadProgress] = useState({ current: 0, total: 0 });
  const [filmGrainEnabled, setFilmGrainEnabled] = useState(true);
  const [filmGrainIntensity, setFilmGrainIntensity] = useState(0.065);
  const [motionBlurEnabled, setMotionBlurEnabled] = useState(false);
  const [motionBlurShutterAngle, setMotionBlurShutterAngle] = useState(180);
  const [dissolveDurationSeconds, setDissolveDurationSeconds] = useState(0.5);
  const [positionEditorIndex, setPositionEditorIndex] = useState<number | null>(null);
  const [pausedTimelineIndex, setPausedTimelineIndex] = useState<number | null>(null);

  const config = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  const getTransform = useCallback((i: number) => mediaTransforms[i] ?? { position: "center center", scale: 1 }, [mediaTransforms]);
  const [transformsKey, setTransformsKey] = useState(0);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjectList(Array.isArray(data) ? data : []))
      .catch(() => setProjectList([]));
  }, []);

  const handleImagesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const files = Array.from(input?.files ?? []);
      if (files.length === 0) return;
      const items: MediaItem[] = files.map((f) => ({
        type: "image",
        url: URL.createObjectURL(f),
        durationInFrames: IMAGE_DURATION_FRAMES,
        fileName: f.name,
      }));
      setMediaItems((prev) => [...prev, ...items]);
      setMediaTransforms((prev) => [
        ...prev,
        ...Array(files.length).fill(null).map(() => ({ position: "center center", scale: 1 })),
      ]);
      input.value = "";
    },
    []
  );

  const handleVideosChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const files = Array.from(input?.files ?? []);
      if (files.length === 0) return;
      setIsLoadingVideos(true);
      setVideoLoadProgress({ current: 0, total: files.length });
      const items: MediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        setVideoLoadProgress({ current: i + 1, total: files.length });
        try {
          const durationSec = await getVideoDuration(files[i]);
          items.push({
            type: "video",
            url: URL.createObjectURL(files[i]),
            durationInFrames: Math.ceil(durationSec * VIDEO_FPS),
            fileName: files[i].name,
          });
        } catch {
          // Skip failed videos
        }
      }
      if (items.length > 0) {
        setMediaItems((prev) => [...prev, ...items]);
        setMediaTransforms((prev) => [
          ...prev,
          ...Array(items.length).fill(null).map(() => ({ position: "center center", scale: 1 })),
        ]);
      }
      input.value = "";
      setIsLoadingVideos(false);
      setVideoLoadProgress({ current: 0, total: 0 });
    },
    []
  );

  const removeMediaItem = useCallback((index: number) => {
    setMediaItems((prev) => {
      const item = prev[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== index);
    });
    setMediaTransforms((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeAllMedia = useCallback(() => {
    mediaItems.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setMediaItems([]);
    setMediaTransforms([]);
  }, [mediaItems]);

  const reorderMediaItems = useCallback((fromIndex: number, toIndex: number) => {
    setMediaItems((prev) => reorderArray(prev, fromIndex, toIndex));
    setMediaTransforms((prev) => reorderArray(prev, fromIndex, toIndex));
  }, []);

  const setMediaTransform = useCallback((index: number, position: string, scale: number) => {
    setMediaTransforms((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push({ position: "center center", scale: 1 });
      next[index] = { position, scale };
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
        setLoadedMusicFileName(null);
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
    setLoadedMusicFileName(null);
    setFitToMusic(false);
    setDurationOption("90");
  }, [musicUrl]);

  const dissolveDurationFrames = Math.round(dissolveDurationSeconds * VIDEO_FPS);
  const mediaDuration =
    mediaItems.length > 0
      ? calculateMediaGalleryDuration(mediaItems, dissolveDurationFrames)
      : 0;

  const durationSeconds =
    durationOption === "music" && musicDuration > 0
      ? musicDuration
      : DURATION_OPTIONS.find((d) => d.id === durationOption)?.seconds ?? 90;
  const textDuration = Math.max(30, Math.ceil(durationSeconds * VIDEO_FPS));

  const musicDurationFrames = Math.ceil(musicDuration * VIDEO_FPS);
  const baseDurationInFrames =
    fitToMusic && musicDuration > 0
      ? musicDurationFrames
      : mediaItems.length > 0
        ? mediaDuration
        : textDuration;
  const endTailFrames = mediaItems.length > 0 ? END_TAIL_SECONDS * VIDEO_FPS : 0;
  const durationInFrames = baseDurationInFrames + endTailFrames;

  const timelineSegments = useMemo(() => {
    if (mediaItems.length === 0) return [] as Array<{ start: number; end: number }>;
    const naturalDuration = calculateMediaGalleryDuration(mediaItems, dissolveDurationFrames);
    const stretch = naturalDuration > 0 ? durationInFrames / naturalDuration : 1;
    let start = 0;
    return mediaItems.map((item) => {
      const scaledDuration = Math.max(
        dissolveDurationFrames,
        Math.round(item.durationInFrames * stretch)
      );
      const segment = { start, end: start + scaledDuration };
      start = segment.end - dissolveDurationFrames;
      return segment;
    });
  }, [mediaItems, dissolveDurationFrames, durationInFrames]);

  const getTimelineIndexForFrame = useCallback(
    (frame: number) => {
      if (timelineSegments.length === 0) return null;
      const clampedFrame = Math.max(0, Math.min(durationInFrames - 1, frame));
      for (let i = 0; i < timelineSegments.length; i++) {
        const seg = timelineSegments[i];
        if (clampedFrame >= seg.start && clampedFrame < seg.end) return i;
      }
      return timelineSegments.length - 1;
    },
    [timelineSegments, durationInFrames]
  );

  useEffect(() => {
    if (positionEditorIndex !== null || mediaItems.length === 0) {
      setPausedTimelineIndex(null);
      return;
    }

    const player = playerRef.current as unknown as {
      isPlaying?: () => boolean;
      getCurrentFrame?: () => number;
      addEventListener?: (name: string, cb: () => void) => void;
      removeEventListener?: (name: string, cb: () => void) => void;
    } | null;
    if (!player?.getCurrentFrame) return;

    let pollTimer: number | null = null;
    const updateFromCurrentFrame = () => {
      const frame = player.getCurrentFrame?.();
      if (typeof frame !== "number") return;
      setPausedTimelineIndex(getTimelineIndexForFrame(frame));
    };
    const startPausedPolling = () => {
      if (pollTimer !== null) return;
      updateFromCurrentFrame();
      pollTimer = window.setInterval(updateFromCurrentFrame, 120);
    };
    const stopPausedPolling = () => {
      if (pollTimer === null) return;
      window.clearInterval(pollTimer);
      pollTimer = null;
    };
    const syncPollingToPlayback = () => {
      if (player.isPlaying?.()) {
        stopPausedPolling();
        setPausedTimelineIndex(null);
      } else {
        startPausedPolling();
      }
    };

    const onPlay = () => syncPollingToPlayback();
    const onPause = () => syncPollingToPlayback();
    const onTimeUpdate = () => {
      if (!player.isPlaying?.()) updateFromCurrentFrame();
    };

    player.addEventListener?.("play", onPlay);
    player.addEventListener?.("pause", onPause);
    player.addEventListener?.("timeupdate", onTimeUpdate);
    syncPollingToPlayback();

    return () => {
      stopPausedPolling();
      player.removeEventListener?.("play", onPlay);
      player.removeEventListener?.("pause", onPause);
      player.removeEventListener?.("timeupdate", onTimeUpdate);
    };
  }, [positionEditorIndex, mediaItems.length, getTimelineIndexForFrame, transformsKey]);

  const getMediaStartFrame = useCallback(
    (index: number) => {
      let startFrame = 0;
      for (let i = 0; i < index && i < mediaItems.length; i++) {
        startFrame +=
          mediaItems[i].durationInFrames - dissolveDurationFrames;
      }
      return Math.round(startFrame + dissolveDurationFrames);
    },
    [mediaItems, dissolveDurationFrames]
  );

  const seekToMedia = useCallback(
    (index: number) => {
      playerRef.current?.seekTo(getMediaStartFrame(index));
    },
    [getMediaStartFrame]
  );

  const handleRender = useCallback(async () => {
    setRenderError(null);
    const check = await canRenderMediaOnWeb({
      width: config.width,
      height: config.height,
    });
    if (!check.canRender) {
      setRenderError(
        check.issues?.[0]?.message ??
          "Your browser does not support in-browser rendering. Try Chrome or Edge."
      );
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);

    const totalFrames = Math.max(1, durationInFrames);
    try {
      const inputProps = {
        mediaItems,
        imagePositions: mediaItems.map((_, i) => getTransform(i).position),
        imageScales: mediaItems.map((_, i) => getTransform(i).scale),
        text: showMessage ? prompt || "Enter a prompt above" : "",
        showMessage,
        audioSrc: musicUrl ?? undefined,
        filmGrainEnabled,
        filmGrainIntensity,
        motionBlurEnabled,
        motionBlurShutterAngle,
        dissolveDurationFrames,
      };

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: "ReelForge",
          component: VideoComposition,
          durationInFrames: totalFrames,
          fps: VIDEO_FPS,
          width: config.width,
          height: config.height,
          defaultProps: inputProps,
        },
        inputProps,
        onProgress: ({ encodedFrames }) =>
          setRenderProgress(Math.min(1, encodedFrames / totalFrames)),
      });

      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reelforge-${config.width}x${config.height}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setRenderError(
        err instanceof Error ? err.message : "Render failed. Try again."
      );
    } finally {
      setIsRendering(false);
      setRenderProgress(0);
    }
  }, [
    mediaItems,
    mediaTransforms,
    getTransform,
    showMessage,
    filmGrainEnabled,
    filmGrainIntensity,
    motionBlurEnabled,
    motionBlurShutterAngle,
    dissolveDurationFrames,
    prompt,
    musicUrl,
    durationInFrames,
    config,
  ]);

  const lazyComponent = useCallback(
    () =>
      import("./remotion/VideoComposition").then((m) => ({
        default: m.VideoComposition,
      })),
    []
  );

  const handleSaveProject = useCallback(async () => {
    const title = projectTitle.trim() || "untitled";
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("platform", platform);
      formData.append("durationOption", durationOption);
      formData.append("fitToMusic", String(fitToMusic));
      formData.append("imagePositions", JSON.stringify(mediaItems.map((_, i) => getTransform(i).position)));
      formData.append("imageScales", JSON.stringify(mediaItems.map((_, i) => getTransform(i).scale)));
      formData.append(
        "mediaItems",
        JSON.stringify(
          mediaItems.map((m, i) => ({
            order: i,
            type: m.type,
            durationInFrames: m.durationInFrames,
            fileName: m.fileName ?? `item-${i}`,
            objectPosition: getTransform(i).position,
          }))
        )
      );
      if (musicFile) {
        formData.append("musicFile", musicFile);
        formData.append("musicDuration", String(musicDuration));
        formData.append("musicFileName", musicFile.name);
      } else if (musicUrl && musicDuration > 0) {
        const r = await fetch(musicUrl);
        const blob = await r.blob();
        formData.append("musicFile", blob, "music.mp3");
        formData.append("musicDuration", String(musicDuration));
        formData.append("musicFileName", "music.mp3");
      }
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        const res = await fetch(item.url);
        const blob = await res.blob();
        const ext = item.type === "video" ? "mp4" : "jpg";
        const name = item.fileName ?? `media-${i}.${ext}`;
        formData.append(`media-${i}`, blob, name);
      }
      const res = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Save failed: ${res.status}`);
      }
      setSaveStatus("Project saved");
      setProjectTitle(title);
      const listRes = await fetch("/api/projects");
      const list = await listRes.json();
      setProjectList(Array.isArray(list) ? list : []);
    } catch (err) {
      setSaveStatus(
        err instanceof Error ? err.message : "Failed to save project"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    projectTitle,
    platform,
    durationOption,
    fitToMusic,
    mediaTransforms,
    getTransform,
    mediaItems,
    musicFile,
    musicDuration,
  ]);

  const handleLoadProject = useCallback(async () => {
    const title = selectedProjectToLoad.trim();
    if (!title) return;
    setIsLoadingProject(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`/api/projects?title=${encodeURIComponent(title)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Project not found");
      }
      const project = await res.json();
      const base = `/api/projects/${encodeURIComponent(project.title)}`;
      const items: MediaItem[] = [];
      const sorted = [...(project.mediaItems ?? [])].sort(
        (a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0)
      );
      for (const m of sorted) {
        const mediaUrl = m.hashKey
          ? `/api/media/${encodeURIComponent(m.hashKey)}`
          : `${base}/media/${encodeURIComponent((m.savedPath ?? `media/${m.order}-${m.fileName ?? "item"}`).replace(/^media\//, ""))}`;
        const r = await fetch(mediaUrl);
        if (!r.ok) continue;
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        items.push({
          type: m.type,
          url,
          durationInFrames: m.durationInFrames ?? IMAGE_DURATION_FRAMES,
          fileName: m.fileName,
        });
      }
      mediaItems.forEach((m) => m.url && URL.revokeObjectURL(m.url));
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      setMediaItems(items);
      const projectTransforms = items.map((_: unknown, i: number) => ({
        position: (project.imagePositions ?? [])[i] ?? "center center",
        scale: (project.imageScales ?? [])[i] ?? 1,
      }));
      setMediaTransforms(projectTransforms);
      setPlatform((project.platform as Platform) ?? platform);
      setDurationOption((project.durationOption as DurationOption) ?? durationOption);
      setFitToMusic(project.fitToMusic ?? false);
      setProjectTitle(project.title ?? title);
      const musicKey = project.musicHashKey ?? project.musicSavedPath;
      if (musicKey) {
        const musicUrlToFetch = project.musicHashKey
          ? `/api/media/${encodeURIComponent(project.musicHashKey)}`
          : `${base}/music`;
        const musicRes = await fetch(musicUrlToFetch);
        if (musicRes.ok) {
          const musicBlob = await musicRes.blob();
          const url = URL.createObjectURL(musicBlob);
          setMusicUrl(url);
          setMusicFile(null);
          setLoadedMusicFileName(project.musicFileName ?? "Music");
          setMusicDuration(project.musicDuration ?? 0);
          setDurationOption("music");
        }
      } else {
        setMusicFile(null);
        setMusicUrl(null);
        setMusicDuration(0);
        setLoadedMusicFileName(null);
      }
      setSaveStatus("Project loaded");
    } catch (err) {
      setSaveStatus(
        err instanceof Error ? err.message : "Failed to load project"
      );
    } finally {
      setIsLoadingProject(false);
    }
  }, [selectedProjectToLoad, musicUrl, mediaItems, platform, durationOption]);

  const handleDeleteProject = useCallback(async () => {
    const title = selectedProjectToLoad.trim();
    if (!title) return;
    const confirmed = window.confirm(
      `Delete project "${title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeletingProject(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`/api/projects?title=${encodeURIComponent(title)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete project");
      }

      setProjectList((prev) => prev.filter((p) => p.title !== title));
      setSelectedProjectToLoad("");
      if (projectTitle.trim() === title) {
        setProjectTitle("");
      }
      setSaveStatus("Project deleted");
    } catch (err) {
      setSaveStatus(
        err instanceof Error ? err.message : "Failed to delete project"
      );
    } finally {
      setIsDeletingProject(false);
    }
  }, [selectedProjectToLoad, projectTitle]);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-white">Create</h1>
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="Project title"
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[200px]"
        />
        <button
          type="button"
          onClick={handleSaveProject}
          disabled={isSaving}
          className="rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "Saving…" : "Save project"}
        </button>
        {projectList.length > 0 && (
          <>
            <select
              value={selectedProjectToLoad}
              onChange={(e) => setSelectedProjectToLoad(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[140px]"
            >
              <option value="">Load project…</option>
              {projectList.map((p) => (
                <option key={p.title} value={p.title}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleLoadProject}
              disabled={!selectedProjectToLoad || isLoadingProject}
              className="rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingProject ? "Loading…" : "Load"}
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              disabled={!selectedProjectToLoad || isDeletingProject}
              className="rounded-md border border-red-500/60 bg-red-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeletingProject ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleRender}
          disabled={isRendering || durationInFrames < 1}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRendering ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {Math.round(renderProgress * 100)}%
            </span>
          ) : (
            "Render to MP4"
          )}
        </button>
        {renderError && (
          <span className="text-sm text-red-400">{renderError}</span>
        )}
        {saveStatus && !renderError && (
          <span className="text-sm text-green-400">{saveStatus}</span>
        )}
      </header>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full min-h-[calc(100vh-8rem)]">
      {/* Console */}
      <aside className="lg:w-80 flex-shrink-0 space-y-4">
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

        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Images & Videos
          </h2>
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">
                Dissolve between clips: {dissolveDurationSeconds}s
              </label>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={dissolveDurationSeconds}
                onChange={(e) => setDissolveDurationSeconds(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none bg-slate-700 accent-indigo-500"
              />
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="sr-only"
                  aria-label="Choose images"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideosChange}
                  className="sr-only"
                  aria-label="Choose videos"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-1 cursor-pointer items-center justify-center rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
                >
                  Add images
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isLoadingVideos}
                  className="flex flex-1 cursor-pointer items-center justify-center rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add videos
                </button>
              </div>
              {isLoadingVideos && videoLoadProgress.total > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-200"
                      style={{
                        width: `${(videoLoadProgress.current / videoLoadProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Loading video {videoLoadProgress.current} of {videoLoadProgress.total}…
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {mediaItems.length > 0
                  ? `${mediaItems.length} clip${mediaItems.length !== 1 ? "s" : ""} chosen`
                  : "No media chosen"}
              </span>
              {mediaItems.length > 0 && (
                <button
                  type="button"
                  onClick={removeAllMedia}
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
            {(musicFile || musicUrl) && (
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
                    {musicFile?.name ?? loadedMusicFileName ?? "Music"}
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
          ) : mediaItems.length > 0 ? (
            <p className="text-sm text-slate-400">
              {(durationInFrames / VIDEO_FPS).toFixed(1)}s from media
            </p>
          ) : (
            <div className="space-y-2">
              {DURATION_OPTIONS.filter(
                (d) => d.id !== "music" || ((musicFile || musicUrl) && musicDuration > 0)
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
            Film grain
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filmGrainEnabled}
                onChange={(e) => setFilmGrainEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-slate-500 focus:ring-slate-500"
              />
              <span className="text-slate-300 text-sm">Enable film grain</span>
            </label>
            {filmGrainEnabled && (
              <div className="space-y-2">
                <label className="text-xs text-slate-500 block">
                  Intensity: {(filmGrainIntensity * 100).toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={filmGrainIntensity}
                  onChange={(e) => setFilmGrainIntensity(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none bg-slate-700 accent-indigo-500"
                />
                <p className="text-xs text-slate-500">
                  Effect visible in the main preview
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Motion blur
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={motionBlurEnabled}
                onChange={(e) => setMotionBlurEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-slate-500 focus:ring-slate-500"
              />
              <span className="text-slate-300 text-sm">Enable motion blur</span>
            </label>
            {motionBlurEnabled && (
              <div className="space-y-2">
                <label className="text-xs text-slate-500 block">
                  Shutter angle: {motionBlurShutterAngle}°
                </label>
                <input
                  type="range"
                  min="15"
                  max="360"
                  step="15"
                  value={motionBlurShutterAngle}
                  onChange={(e) => setMotionBlurShutterAngle(parseInt(e.target.value, 10))}
                  className="w-full h-2 rounded-lg appearance-none bg-slate-700 accent-indigo-500"
                />
                <p className="text-xs text-slate-500">
                  180° = film-like, higher = more blur. May slow preview.
                </p>
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* Studio */}
      <section className="flex-1 min-w-0">
        <div className="rounded-lg border border-slate-700 bg-slate-900/30 overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">
              {positionEditorIndex !== null ? `Editing clip ${positionEditorIndex + 1} — drag to reposition, adjust zoom, then Save` : "Preview"}
            </span>
            <span className="text-xs text-slate-500">
              {config.width}×{config.height}
            </span>
          </div>
          <div className="p-4 flex justify-center bg-slate-950/50">
            {positionEditorIndex !== null && mediaItems[positionEditorIndex] ? (
              <div className="flex w-full max-w-[1060px]">
                <InlineMediaEditor
                  mediaUrl={mediaItems[positionEditorIndex].url}
                  mediaType={mediaItems[positionEditorIndex].type}
                  currentPosition={getTransform(positionEditorIndex).position}
                  currentScale={getTransform(positionEditorIndex).scale}
                  frameWidth={config.width}
                  frameHeight={config.height}
                  onSave={async (position, scale) => {
                    setMediaTransforms((prev) => {
                      const next = [...prev];
                      while (next.length <= positionEditorIndex) next.push({ position: "center center", scale: 1 });
                      next[positionEditorIndex] = { position, scale };
                      return next;
                    });
                    setTransformsKey((k) => k + 1);
                    setPositionEditorIndex(null);
                  }}
                  onCancel={() => setPositionEditorIndex(null)}
                />
              </div>
            ) : (
              <Player
                key={transformsKey}
                ref={playerRef}
                lazyComponent={lazyComponent}
                inputProps={{
                  mediaItems,
                  imagePositions: mediaItems.map((_, i) => getTransform(i).position),
                  imageScales: mediaItems.map((_, i) => getTransform(i).scale),
                  text: showMessage ? prompt || "Enter a prompt above" : "",
                  showMessage,
                  audioSrc: musicUrl ?? undefined,
                  filmGrainEnabled,
                  filmGrainIntensity,
                  motionBlurEnabled,
                  motionBlurShutterAngle,
                  dissolveDurationFrames,
                }}
                durationInFrames={durationInFrames}
                compositionWidth={config.width}
                compositionHeight={config.height}
                fps={VIDEO_FPS}
                controls
                style={{
                  width: "100%",
                  maxWidth: Math.min(820, config.width),
                }}
              />
            )}
          </div>

          {mediaItems.length > 0 && (
            <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/30">
              <p className="text-xs text-slate-500 mb-2">
                Timeline — drag to reorder, × to remove, double-click to adjust position & scale
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 items-start">
                {mediaItems.map((item, index) => (
                  <div
                    key={`${item.type}-${item.url}-${index}`}
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
                          reorderMediaItems(draggedIndex, index);
                        }
                        setDraggedIndex(null);
                        setDropTargetIndex(null);
                      }}
                      onDoubleClick={() => setPositionEditorIndex(index)}
                      className={`
                        relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing
                        transition-all duration-150
                        ${pausedTimelineIndex === index ? "border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]" : "border-slate-600 hover:border-slate-500"}
                        ${draggedIndex === index ? "opacity-50 scale-95" : ""}
                      `}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMediaItem(index);
                        }}
                        onDoubleClick={(e) => e.stopPropagation()}
                        className="absolute top-0.5 right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 text-xs leading-none"
                        aria-label={`Remove ${index + 1}`}
                      >
                        ×
                      </button>
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt={`Slide ${index + 1}`}
                          className="w-full h-full pointer-events-none"
                          draggable={false}
                          style={{
                            objectFit: "cover",
                            objectPosition: getTransform(index).position,
                            transform: `scale(${getTransform(index).scale})`,
                          }}
                        />
                      ) : (
                        <video
                          src={item.url}
                          muted
                          className="w-full h-full pointer-events-none"
                          preload="metadata"
                          crossOrigin="anonymous"
                          style={{
                            objectFit: "cover",
                            objectPosition: getTransform(index).position,
                            transform: `scale(${getTransform(index).scale})`,
                          }}
                        />
                      )}
                      <span className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0.5 bg-black/70 text-white text-xs py-0.5">
                        {item.type === "video" && (
                          <span className="text-[8px]">▶</span>
                        )}
                        {index + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
    </>
  );
}
