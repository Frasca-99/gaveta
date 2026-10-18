import { Composition } from "remotion";
import { DURACAO, Filme, FPS } from "./Filme";
import { DURACAO_USO, NaPratica } from "./Uso";

/**
 * Two films of the real app, recorded on a Mac: the reel goes through what is
 * well made in it, chapter by chapter; "na prática" is one everyday use, in
 * real time.
 */
export const Root = () => (
  <>
    <Composition id="Reel" component={Filme} durationInFrames={DURACAO} fps={FPS} width={1920} height={1080} />
    <Composition id="NaPratica" component={NaPratica} durationInFrames={DURACAO_USO} fps={FPS} width={1920} height={1080} />
  </>
);
