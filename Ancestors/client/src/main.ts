import { Engine } from "@babylonjs/core/Engines/engine";
import { generateAndLoadMap } from "./map/data/loadMapArtifact";
import { createAncestorsScene } from "./map/scene/createAncestorsScene";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

app.innerHTML = `
  <canvas id="render-canvas"></canvas>
  <section id="hud">
    <strong>Ancestors</strong>
    <span id="status">Loading...</span>
  </section>
  <section id="debug">No cell</section>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#render-canvas");
const status = document.querySelector<HTMLSpanElement>("#status");
const debug = document.querySelector<HTMLElement>("#debug");
if (!canvas || !status || !debug) throw new Error("Missing UI");

const canvasElement = canvas;
const statusElement = status;
const debugElement = debug;
const engine = new Engine(canvasElement, true, { antialias: true });
let disposeScene: (() => void) | null = null;

async function boot(): Promise<void> {
  const artifact = await generateAndLoadMap();
  disposeScene?.();
  const scene = createAncestorsScene(engine, canvasElement, artifact, {
    onHover(cell) {
      debugElement.textContent = cell
        ? `offset=${cell.offset.x},${cell.offset.z}
cube=${cell.coordinates.x},${cell.coordinates.y},${cell.coordinates.z}
color=${cell.colorId}
elevation=${cell.elevation}`
        : "No cell";
    }
  });
  disposeScene = scene.dispose;
  engine.runRenderLoop(scene.render);
  statusElement.textContent = `${artifact.cells.length} cells`;
}

window.addEventListener("resize", () => engine.resize());
boot().catch((error) => {
  console.error(error);
  statusElement.textContent = "Load failed";
});
