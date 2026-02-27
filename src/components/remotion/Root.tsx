import { Composition } from "remotion";
import { FadeScaleText } from "./FadeScaleText";
import { PromptText } from "./PromptText";

const FPS = 30;
const DURATION = 150;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="FadeScaleText"
        component={FadeScaleText}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="PromptText-TikTok"
        component={PromptText}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ text: "Enter a prompt" }}
      />
      <Composition
        id="PromptText-FB-Square"
        component={PromptText}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={{ text: "Enter a prompt" }}
      />
      <Composition
        id="PromptText-FB-Video"
        component={PromptText}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ text: "Enter a prompt" }}
      />
    </>
  );
};
