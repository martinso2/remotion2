import { Audio, Video } from "@remotion/media";
import { CameraMotionBlur } from "@remotion/motion-blur";
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
  filmGrainEnabled?: boolean;
  filmGrainIntensity?: number;
  motionBlurEnabled?: boolean;
  motionBlurShutterAngle?: number;
  /** Crossfade/dissolve duration in frames between clips (default 15) */
  dissolveDurationFrames?: number;
};

export function calculateMediaGalleryDuration(
  mediaItems: MediaItem[],
  dissolveDurationFrames: number = FADE_DURATION_FRAMES
): number {
  if (mediaItems.length === 0) return 0;
  const total =
    mediaItems.reduce((sum, m) => sum + m.durationInFrames, 0) -
    (mediaItems.length - 1) * dissolveDurationFrames;
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
  fadeDurationFrames,
}: {
  seg: Segment;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  objectPosition: string;
  muteVideo: boolean;
  fadeDurationFrames: number;
}) {
  const localFrame = useCurrentFrame();
  const durationInFrames = seg.durationInFrames;

  let opacity = 1;
  if (!isFirst && localFrame < fadeDurationFrames) {
    opacity = interpolate(
      localFrame,
      [0, fadeDurationFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  } else if (!isLast && localFrame > durationInFrames - fadeDurationFrames) {
    opacity = interpolate(
      localFrame,
      [durationInFrames - fadeDurationFrames, durationInFrames],
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
  filmGrainEnabled = true,
  filmGrainIntensity = 0.15,
  motionBlurEnabled = false,
  motionBlurShutterAngle = 180,
  dissolveDurationFrames = FADE_DURATION_FRAMES,
}: MediaGalleryWithAudioProps) => {
  const { fps, durationInFrames } = useVideoConfig();

  const fadeDurationFrames = 1.5 * fps;
  const fadeStart = Math.max(0, durationInFrames - fadeDurationFrames);

  if (mediaItems.length === 0) {
    return null;
  }

  const naturalDuration = calculateMediaGalleryDuration(mediaItems, dissolveDurationFrames);
  // Scale: < 1 = speed up (compress), > 1 = slow down (stretch to fill)
  const scale =
    naturalDuration > 0
      ? durationInFrames / naturalDuration
      : 1;

  let currentStart = 0;
  const segments = mediaItems.map((item) => {
    const scaledDuration = Math.max(
      dissolveDurationFrames,
      Math.round(item.durationInFrames * scale)
    );
    const startFrame = currentStart;
    const endFrame = startFrame + scaledDuration;
    currentStart = endFrame - dissolveDurationFrames;
    return {
      ...item,
      durationInFrames: scaledDuration,
      startFrame,
      endFrame,
      originalDurationInFrames: item.type === "video" ? item.durationInFrames : undefined,
    };
  });

  const frame = useCurrentFrame();
  const intensity = Math.min(1, filmGrainIntensity ?? 0.25);
  const showGrain = (filmGrainEnabled ?? true) && intensity > 0;
  const k2 = 1 - intensity;
  const k3 = intensity;
  const filterId = `reelforge-grain-${String(intensity).replace(".", "-")}`;

  const visualContent = (
    <AbsoluteFill
      key={filterId}
      style={showGrain ? { filter: `url(#${filterId})` } : undefined}
    >
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
              fadeDurationFrames={dissolveDurationFrames}
            />
          </Sequence>
        );
      })}

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

  const wrappedVisual = motionBlurEnabled ? (
    <CameraMotionBlur
      shutterAngle={Math.max(1, motionBlurShutterAngle)}
      samples={6}
    >
      {visualContent}
    </CameraMotionBlur>
  ) : (
    visualContent
  );

  return (
    <AbsoluteFill>
      {showGrain && (
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
      )}
      {wrappedVisual}
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
    </AbsoluteFill>
  );
};
