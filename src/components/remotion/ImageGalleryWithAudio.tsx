import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const IMAGE_DURATION_FRAMES = 120; // 4 seconds at 30fps
export const FADE_DURATION_FRAMES = 15;
const OVERLAP_OFFSET = IMAGE_DURATION_FRAMES - FADE_DURATION_FRAMES; // 105

export type ImageGalleryWithAudioProps = {
  imageUrls: string[];
  imagePositions?: string[];
  text?: string;
  audioSrc?: string;
};

export function calculateImageGalleryDuration(imageCount: number): number {
  if (imageCount === 0) return 0;
  return (imageCount - 1) * OVERLAP_OFFSET + IMAGE_DURATION_FRAMES;
}

export const ImageGalleryWithAudio = ({
  imageUrls,
  imagePositions,
  text,
  audioSrc,
}: ImageGalleryWithAudioProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeDurationFrames = 1.5 * fps;
  const fadeStart = Math.max(0, durationInFrames - fadeDurationFrames);

  if (imageUrls.length === 0) {
    return null;
  }

  const imageCount = imageUrls.length;
  const imageDurationFrames =
    (durationInFrames + (imageCount - 1) * FADE_DURATION_FRAMES) / imageCount;
  const overlapOffset = imageDurationFrames - FADE_DURATION_FRAMES;

  return (
    <AbsoluteFill>
      {imageUrls.map((src, i) => {
        const startFrame = i * overlapOffset;
        const endFrame = startFrame + imageDurationFrames;
        const isFirst = i === 0;
        const isLast = i === imageUrls.length - 1;

        let opacity = 0;
        if (frame < startFrame || frame > endFrame) {
          opacity = 0;
        } else if (!isFirst && frame < startFrame + FADE_DURATION_FRAMES) {
          opacity = interpolate(
            frame,
            [startFrame, startFrame + FADE_DURATION_FRAMES],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
        } else if (!isLast && frame > endFrame - FADE_DURATION_FRAMES) {
          opacity = interpolate(
            frame,
            [endFrame - FADE_DURATION_FRAMES, endFrame],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
        } else {
          opacity = 1;
        }

        const localFrame = frame - startFrame;
        const zoomIn = i % 2 === 0;
        const scale = interpolate(
          localFrame,
          [0, imageDurationFrames],
          zoomIn ? [1, 1.08] : [1.08, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const objectPosition =
          imagePositions?.[i] ?? "center center";

        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            <Img
              src={src}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition,
                transform: `scale(${scale})`,
              }}
            />
          </AbsoluteFill>
        );
      })}

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
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            className="text-white text-4xl font-semibold text-center px-8 drop-shadow-lg"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
          >
            {text}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
