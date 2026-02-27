import { PromptText } from "./PromptText";

export const FadeScaleText = (props: { text?: string }) => (
  <PromptText text={props.text ?? "Hello Remotion"} />
);
