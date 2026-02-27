import { ImageGalleryWithAudio } from "./ImageGalleryWithAudio";
import { PromptTextWithAudio } from "./PromptTextWithAudio";

export type VideoCompositionProps = {
  imageUrls: string[];
  imagePositions?: string[];
  text: string;
  showMessage: boolean;
  audioSrc?: string;
};

export const VideoComposition = ({
  imageUrls,
  imagePositions,
  text,
  showMessage,
  audioSrc,
}: VideoCompositionProps) => {
  if (imageUrls.length > 0) {
    return (
      <ImageGalleryWithAudio
        imageUrls={imageUrls}
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
