import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type ImageSlideProps = {
  src: string;
  zoomIn?: boolean;
};

export const ImageSlide = ({ src, zoomIn = true }: ImageSlideProps) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(
    frame,
    [0, durationInFrames],
    zoomIn ? [1, 1.08] : [1.08, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};
