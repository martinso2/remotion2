"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function VideoCanvasLayer({
  containerRef,
  mediaUrl,
  position,
  scale,
  isDragging,
  onMouseDown,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mediaUrl: string;
  position: { x: number; y: number };
  scale: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || canvas.width === 0) return;

    const draw = () => {
      if (video.readyState < 2) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) return;

      const coverScale = Math.max(cw / vw, ch / vh);
      const displayScale = coverScale * scale;
      const dw = vw * displayScale;
      const dh = vh * displayScale;

      const posX = (position.x / 100) * cw - (position.x / 100) * dw;
      const posY = (position.y / 100) * ch - (position.y / 100) * dh;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(video, 0, 0, vw, vh, posX, posY, dw, dh);
    };

    const onTimeUpdate = () => requestAnimationFrame(draw);
    video.addEventListener("timeupdate", onTimeUpdate);
    draw();
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [position, scale, containerRef]);

  return (
    <>
      <video
        ref={videoRef}
        src={mediaUrl}
        muted
        loop
        autoPlay
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 select-none"
        style={{ cursor: isDragging ? "grabbing" : "grab", width: "100%", height: "100%" }}
        onMouseDown={onMouseDown}
      />
    </>
  );
}

function parsePosition(position: string): { x: number; y: number } {
  const pctMatch = position.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (pctMatch) {
    return { x: parseFloat(pctMatch[1]), y: parseFloat(pctMatch[2]) };
  }
  const parts = position.trim().toLowerCase().split(/\s+/);
  const y = parts.includes("top") ? 0 : parts.includes("bottom") ? 100 : 50;
  const x = parts.includes("left") ? 0 : parts.includes("right") ? 100 : 50;
  return { x, y };
}

function toPositionString(x: number, y: number): string {
  return `${Math.round(x)}% ${Math.round(y)}%`;
}

export type InlineMediaEditorProps = {
  mediaUrl: string;
  mediaType: "image" | "video";
  currentPosition: string;
  currentScale: number;
  frameWidth: number;
  frameHeight: number;
  onSave: (position: string, scale: number) => void;
  onCancel: () => void;
};

export function InlineMediaEditor({
  mediaUrl,
  mediaType,
  currentPosition,
  currentScale,
  frameWidth,
  frameHeight,
  onSave,
  onCancel,
}: InlineMediaEditorProps) {
  const [position, setPosition] = useState(() => parsePosition(currentPosition));
  const [scale, setScale] = useState(currentScale);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(position);
  const scaleRef = useRef(scale);
  positionRef.current = position;
  scaleRef.current = scale;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position]
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = 100 / rect.width;
    const scaleY = 100 / rect.height;
    const dx = (e.clientX - dragStartRef.current.x) * scaleX;
    const dy = (e.clientY - dragStartRef.current.y) * scaleY;
    setPosition({
      x: Math.max(0, Math.min(100, dragStartRef.current.posX - dx)),
      y: Math.max(0, Math.min(100, dragStartRef.current.posY - dy)),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { capture: true });
    window.addEventListener("mouseup", handleMouseUp, { capture: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove, { capture: true });
      window.removeEventListener("mouseup", handleMouseUp, { capture: true });
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleSave = useCallback(() => {
    onSave(toPositionString(positionRef.current.x, positionRef.current.y), scaleRef.current);
  }, [onSave]);
  const handleResetPosition = useCallback(() => {
    setPosition({ x: 50, y: 50 });
  }, []);

  const positionStyle = `${position.x}% ${position.y}%`;

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
      <div className="w-full flex-1 min-w-0">
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg border-2 border-indigo-500/50 bg-slate-950"
          style={{
            width: "100%",
            maxWidth: Math.min(820, frameWidth),
            aspectRatio: `${frameWidth} / ${frameHeight}`,
          }}
        >
          {mediaType === "image" ? (
            <div
              className="absolute inset-0 select-none"
              style={{
                backgroundImage: `url(${mediaUrl})`,
                backgroundSize: `${100 * scale}% ${100 * scale}%`,
                backgroundPosition: positionStyle,
                backgroundRepeat: "no-repeat",
                cursor: isDragging ? "grabbing" : "grab",
              }}
              onMouseDown={handleMouseDown}
            />
          ) : (
            <VideoCanvasLayer
              containerRef={containerRef}
              mediaUrl={mediaUrl}
              position={position}
              scale={scale}
              isDragging={isDragging}
              onMouseDown={handleMouseDown}
            />
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 lg:w-72 lg:flex-shrink-0">
        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Zoom: {Math.round(scale * 100)}%
          </label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
        <p className="text-xs text-slate-500">
          Position: {Math.round(position.x)}% × {Math.round(position.y)}% — drag the image to reposition
        </p>
        <div className="flex gap-2 lg:flex-col">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResetPosition}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            Reset center
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
