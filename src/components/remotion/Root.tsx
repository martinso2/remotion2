import { Composition } from "remotion";
import { FadeScaleText } from "./FadeScaleText";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="FadeScaleText"
        component={FadeScaleText}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
