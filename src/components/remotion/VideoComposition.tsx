import { FilmGrainFilter } from "./FilmGrainFilter";
import { MediaGalleryWithAudio } from "./MediaGalleryWithAudio";
import { PromptTextWithAudio } from "./PromptTextWithAudio";

export type VideoCompositionProps = {
  mediaItems: { type: "image" | "video"; url: string; durationInFrames: number }[];
  imagePositions?: string[];
  imageScales?: number[];
  text: string;
  showMessage: boolean;
  audioSrc?: string;
  filmGrainEnabled?: boolean;
  filmGrainIntensity?: number;
  motionBlurEnabled?: boolean;
  motionBlurShutterAngle?: number;
  dissolveDurationFrames?: number;
};

export const VideoComposition = ({
  mediaItems,
  imagePositions,
  imageScales,
  text,
  showMessage,
  audioSrc,
  filmGrainEnabled = true,
  filmGrainIntensity = 0.1,
  motionBlurEnabled = false,
  motionBlurShutterAngle = 180,
  dissolveDurationFrames,
}: VideoCompositionProps) => {
  if (mediaItems.length > 0) {
    // When motion blur is on: apply grain on top (sharp grain on blurred image).
    // When motion blur is off: apply grain inside MediaGalleryWithAudio.
    // Motion blur and Audio are both in MediaGalleryWithAudio; Audio stays outside CameraMotionBlur.
    const mediaGalleryProps = {
      mediaItems,
      imagePositions,
      imageScales,
      text: showMessage && text ? text : undefined,
      audioSrc,
      filmGrainEnabled: motionBlurEnabled ? false : filmGrainEnabled,
      filmGrainIntensity,
      motionBlurEnabled,
      motionBlurShutterAngle,
      dissolveDurationFrames,
    };

    let content = <MediaGalleryWithAudio {...mediaGalleryProps} />;

    if (motionBlurEnabled && filmGrainEnabled) {
      content = (
        <FilmGrainFilter enabled intensity={filmGrainIntensity}>
          {content}
        </FilmGrainFilter>
      );
    }

    return content;
  }

  return (
    <PromptTextWithAudio
      text={showMessage ? text : ""}
      audioSrc={audioSrc}
    />
  );
};
