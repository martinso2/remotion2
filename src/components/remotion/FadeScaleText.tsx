import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const FadeScaleText = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const scale = interpolate(frame, [0, fps * 1.5], [0.8, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill className="bg-slate-900 items-center justify-center">
      <div
        className="text-white text-6xl font-semibold"
        style={{
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        Hello Remotion
      </div>
    </AbsoluteFill>
  );
};
