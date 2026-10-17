import { Composition } from "remotion";
import { DURACAO, Filme, FPS } from "./Filme";

/** Gaveta at work, the real app recorded on a Mac, cut as a design reel. */
export const Root = () => (
  <Composition id="Filme" component={Filme} durationInFrames={DURACAO} fps={FPS} width={1920} height={1080} />
);
