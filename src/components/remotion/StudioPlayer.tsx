"use client";

import { Player } from "@remotion/player";
import { FadeScaleText } from "./FadeScaleText";

export const StudioPlayer = () => {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-700">
      <Player
        component={FadeScaleText}
        durationInFrames={150}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        controls
        style={{ width: "100%", maxWidth: 960 }}
      />
    </div>
  );
};
