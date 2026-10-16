import { Composition } from "remotion";
import roteiro from "../public/roteiro.json";
import { Gaveta, duracao, FPS } from "./Gaveta";

/** Two cuts of the same film: wide for X and the desktop, square for phones in the feed. */
export const Root = () => (
  <>
    <Composition
      id="Gaveta"
      component={Gaveta}
      durationInFrames={duracao(roteiro.duration)}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ formato: "largo" as const }}
    />
    <Composition
      id="GavetaQuadrado"
      component={Gaveta}
      durationInFrames={duracao(roteiro.duration)}
      fps={FPS}
      width={1080}
      height={1080}
      defaultProps={{ formato: "quadrado" as const }}
    />
  </>
);
