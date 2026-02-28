import { AbsoluteFill, useCurrentFrame } from "remotion";

/**
 * Applies film grain as an SVG filter on top of children.
 * Use this when grain should be the final layer (e.g. on top of motion blur).
 */
export const FilmGrainFilter: React.FC<{
  enabled?: boolean;
  intensity?: number;
  children: React.ReactNode;
}> = ({ enabled = true, intensity = 0.25, children }) => {
  const frame = useCurrentFrame();
  const i = Math.min(1, intensity);
  const showGrain = enabled && i > 0;
  const k2 = 1 - i;
  const k3 = i;
  const filterId = `reelforge-grain-top-${String(i).replace(".", "-")}`;

  if (!showGrain) {
    return <>{children}</>;
  }

  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={filterId} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              seed={frame}
              result="noise"
            />
            <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
            <feComponentTransfer in="mono" result="contrast">
              <feFuncR type="linear" slope="4" intercept="-1.5" />
              <feFuncG type="linear" slope="4" intercept="-1.5" />
              <feFuncB type="linear" slope="4" intercept="-1.5" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="contrast" mode="soft-light" result="blended" />
            <feComposite
              in="SourceGraphic"
              in2="blended"
              operator="arithmetic"
              k1="0"
              k2={k2}
              k3={k3}
              k4="0"
            />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill key={filterId} style={{ filter: `url(#${filterId})` }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
