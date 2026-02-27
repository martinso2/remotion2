import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type PromptTextProps = {
  text: string;
};

export const PromptText = ({ text }: PromptTextProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const scale = interpolate(frame, [0, fps * 1.5], [0.8, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const fontSize = Math.round(Math.min(width, height) * 0.1);

  return (
    <AbsoluteFill className="bg-slate-900 items-center justify-center">
      <div
        className="text-white font-semibold text-center px-8"
        style={{
          fontSize,
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        {text || "Enter a prompt"}
      </div>
    </AbsoluteFill>
  );
};
