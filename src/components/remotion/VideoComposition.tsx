import { MediaGalleryWithAudio } from "./MediaGalleryWithAudio";
import { PromptTextWithAudio } from "./PromptTextWithAudio";

export type VideoCompositionProps = {
  mediaItems: { type: "image" | "video"; url: string; durationInFrames: number }[];
  imagePositions?: string[];
  text: string;
  showMessage: boolean;
  audioSrc?: string;
};

export const VideoComposition = ({
  mediaItems,
  imagePositions,
  text,
  showMessage,
  audioSrc,
}: VideoCompositionProps) => {
  if (mediaItems.length > 0) {
    return (
      <MediaGalleryWithAudio
        mediaItems={mediaItems}
        imagePositions={imagePositions}
        text={showMessage && text ? text : undefined}
        audioSrc={audioSrc}
      />
    );
  }

  return (
    <PromptTextWithAudio
      text={showMessage ? text : ""}
      audioSrc={audioSrc}
    />
  );
};
