import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const FilmGrain: React.FC<{
  opacity?: number; // 0..1
  scale?: number; // grain size (higher = larger grain)
  animate?: boolean; // subtle dancing grain
  soften?: number; // blur in px
  blendMode?: React.CSSProperties["mixBlendMode"];
}> = ({
  opacity = 0.12,
  scale = 0.8,
  animate = true,
  soften = 0.3,
  blendMode = "overlay",
}) => {
  const frame = useCurrentFrame();

  // Change seed a bit over time so grain "dances"
  const seed = animate ? Math.floor(frame / 2) : 0;

  // Unique IDs so multiple instances don't collide
  const ids = useMemo(() => {
    const r = Math.random().toString(16).slice(2);
    return { filter: `noise-${r}`, rect: `rect-${r}` };
  }, []);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        mixBlendMode: blendMode,
        filter: soften > 0 ? `blur(${soften}px)` : undefined,
      }}
    >
      <svg width="100%" height="100%" preserveAspectRatio="none">
        <filter id={ids.filter}>
          {/* feTurbulence creates noise; baseFrequency controls grain size */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency={0.9 * scale}
            numOctaves={3}
            seed={seed}
            stitchTiles="stitch"
          />
          {/* Increase contrast a bit */}
          <feColorMatrix
            type="matrix"
            values="
              1.6 0   0   0  -0.3
              0   1.6 0   0  -0.3
              0   0   1.6 0  -0.3
              0   0   0   1   0
            "
          />
        </filter>

        <rect
          id={ids.rect}
          width="100%"
          height="100%"
          filter={`url(#${ids.filter})`}
        />
      </svg>
    </AbsoluteFill>
  );
};
