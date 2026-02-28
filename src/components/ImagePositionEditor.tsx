"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

type ImagePositionEditorProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (position: string, scale: number) => void;
  mediaUrl: string;
  mediaType: "image" | "video";
  currentPosition: string;
  currentScale: number;
  frameWidth: number;
  frameHeight: number;
};

export function ImagePositionEditor({
  isOpen,
  onClose,
  onSave,
  mediaUrl,
  mediaType,
  currentPosition,
  currentScale,
  frameWidth,
  frameHeight,
}: ImagePositionEditorProps) {
  const [position, setPosition] = useState(() => parsePosition(currentPosition));
  const [scale, setScale] = useState(currentScale);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosition(parsePosition(currentPosition));
    setScale(currentScale);
  }, [currentPosition, currentScale, isOpen]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = 100 / rect.width;
      const scaleY = 100 / rect.height;
      const dx = (e.clientX - dragStartRef.current.x) * scaleX;
      const dy = (e.clientY - dragStartRef.current.y) * scaleY;
      setPosition({
        x: Math.max(0, Math.min(100, dragStartRef.current.posX - dx)),
        y: Math.max(0, Math.min(100, dragStartRef.current.posY - dy)),
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isOpen, handleMouseMove, handleMouseUp]);

  const handleSave = useCallback(() => {
    onSave(toPositionString(position.x, position.y), scale);
    onClose();
  }, [position, scale, onSave, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  const positionStyle = `${position.x}% ${position.y}%`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-600 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-200">
            Adjust position & scale — drag to reposition, slider to zoom
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500"
            >
              Save
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-auto p-6">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-lg border-2 border-slate-600 bg-slate-950"
            style={{
              width: Math.min(400, frameWidth),
              height: Math.min(400 * (frameHeight / frameWidth), frameHeight),
              aspectRatio: `${frameWidth} / ${frameHeight}`,
            }}
          >
            {/* Images: use background so scale creates overflow on both axes — X and Y panning work when zoomed */}
            {mediaType === "image" ? (
              <div
                className="absolute inset-0 select-none"
                style={{
                  backgroundImage: `url(${mediaUrl})`,
                  backgroundSize: `${100 * scale}%`,
                  backgroundPosition: positionStyle,
                  backgroundRepeat: "no-repeat",
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                onMouseDown={handleMouseDown}
              />
            ) : (
              /* Videos: transform scale zooms in so both X and Y panning work when scale > 1 */
              <video
                src={mediaUrl}
                muted
                loop
                autoPlay
                playsInline
                className="absolute inset-0 h-full w-full select-none object-cover origin-center"
                style={{
                  objectPosition: positionStyle,
                  transform: `scale(${scale})`,
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                draggable={false}
                onMouseDown={handleMouseDown}
              />
            )}
          </div>
          <div className="flex w-full max-w-md flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Scale: {Math.round(scale * 100)}%
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
              Position: {Math.round(position.x)}% × {Math.round(position.y)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
