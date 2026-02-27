import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const IMAGE_DURATION_FRAMES = 120;
export const FADE_DURATION_FRAMES = 15;

export type MediaItem = {
  type: "image" | "video";
  url: string;
  durationInFrames: number;
  /** Original file name for project save */
  fileName?: string;
};

export type MediaGalleryWithAudioProps = {
  mediaItems: MediaItem[];
  imagePositions?: string[];
  text?: string;
  audioSrc?: string;
};

export function calculateMediaGalleryDuration(mediaItems: MediaItem[]): number {
  if (mediaItems.length === 0) return 0;
  const total =
    mediaItems.reduce((sum, m) => sum + m.durationInFrames, 0) -
    (mediaItems.length - 1) * FADE_DURATION_FRAMES;
  return Math.max(0, total);
}

type Segment = MediaItem & {
  startFrame: number;
  endFrame: number;
  /** Original duration before stretch; used for video playbackRate */
  originalDurationInFrames?: number;
};

function MediaSegment({
  seg,
  index,
  isFirst,
  isLast,
  objectPosition,
  muteVideo,
}: {
  seg: Segment;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  objectPosition: string;
  muteVideo: boolean;
}) {
  const localFrame = useCurrentFrame();
  const durationInFrames = seg.durationInFrames;

  let opacity = 1;
  if (!isFirst && localFrame < FADE_DURATION_FRAMES) {
    opacity = interpolate(
      localFrame,
      [0, FADE_DURATION_FRAMES],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  } else if (!isLast && localFrame > durationInFrames - FADE_DURATION_FRAMES) {
    opacity = interpolate(
      localFrame,
      [durationInFrames - FADE_DURATION_FRAMES, durationInFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }

  if (seg.type === "video") {
    const orig = seg.originalDurationInFrames ?? durationInFrames;
    const playbackRate = orig < durationInFrames ? orig / durationInFrames : 1;
    return (
      <AbsoluteFill style={{ opacity }}>
        <Video
          src={seg.url}
          trimAfter={durationInFrames}
          playbackRate={playbackRate}
          muted={muteVideo}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition,
          }}
        />
      </AbsoluteFill>
    );
  }

  const zoomIn = index % 2 === 0;
  const scale = interpolate(
    localFrame,
    [0, durationInFrames],
    zoomIn ? [1, 1.08] : [1.08, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={seg.url}
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
}

export const MediaGalleryWithAudio = ({
  mediaItems,
  imagePositions,
  text,
  audioSrc,
}: MediaGalleryWithAudioProps) => {
  const { fps, durationInFrames } = useVideoConfig();

  const fadeDurationFrames = 1.5 * fps;
  const fadeStart = Math.max(0, durationInFrames - fadeDurationFrames);

  if (mediaItems.length === 0) {
    return null;
  }

  const naturalDuration = calculateMediaGalleryDuration(mediaItems);
  // Scale: < 1 = speed up (compress), > 1 = slow down (stretch to fill)
  const scale =
    naturalDuration > 0
      ? durationInFrames / naturalDuration
      : 1;

  let currentStart = 0;
  const segments = mediaItems.map((item) => {
    const scaledDuration = Math.max(
      FADE_DURATION_FRAMES,
      Math.round(item.durationInFrames * scale)
    );
    const startFrame = currentStart;
    const endFrame = startFrame + scaledDuration;
    currentStart = endFrame - FADE_DURATION_FRAMES;
    return {
      ...item,
      durationInFrames: scaledDuration,
      startFrame,
      endFrame,
      originalDurationInFrames: item.type === "video" ? item.durationInFrames : undefined,
    };
  });

  return (
    <AbsoluteFill>
      {segments.map((seg, i) => {
        const isFirst = i === 0;
        const isLast = i === segments.length - 1;
        const objectPosition = imagePositions?.[i] ?? "top center";

        return (
          <Sequence
            key={`${seg.type}-${seg.url}-${i}`}
            from={seg.startFrame}
            durationInFrames={seg.durationInFrames}
            name={seg.type === "video" ? `Video ${i + 1}` : `Image ${i + 1}`}
          >
            <MediaSegment
              seg={seg}
              index={i}
              isFirst={isFirst}
              isLast={isLast}
              objectPosition={objectPosition}
              muteVideo={!!audioSrc}
            />
          </Sequence>
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
