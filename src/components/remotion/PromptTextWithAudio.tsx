import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type PromptTextWithAudioProps = {
  text: string;
  audioSrc?: string;
};

export const PromptTextWithAudio = ({
  text,
  audioSrc,
}: PromptTextWithAudioProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const scale = interpolate(frame, [0, fps * 1.5], [0.8, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const fadeDurationFrames = 1.5 * fps; // 1.5 second fade
  const fadeStart = Math.max(0, durationInFrames - fadeDurationFrames);

  return (
    <AbsoluteFill className="bg-slate-900 items-center justify-center">
      {audioSrc && (
        <Audio
          src={audioSrc}
          volume={(f) =>
            interpolate(f, [fadeStart, durationInFrames], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
          trimAfter={durationInFrames}
        />
      )}
      {text && (
        <div
          className="text-white font-semibold text-center px-8"
          style={{
            fontSize: Math.round(Math.min(width, height) * 0.1),
            opacity,
            transform: `scale(${scale})`,
          }}
        >
          {text}
        </div>
      )}
    </AbsoluteFill>
  );
};
