import { Engine } from "@babylonjs/core/Engines/engine";
import { generateAndLoadMap } from "./map/data/loadMapArtifact";
import { createMapScene } from "./map/scene/createMapScene";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

app.innerHTML = `
  <canvas id="map-canvas"></canvas>
  <div id="hud">
    <div class="hud-title">Asura Map</div>
    <div id="status">Loading map...</div>
    <button id="regenerate" type="button">Generate</button>
  </div>
  <div id="debug-panel">No tile</div>
`;

const canvasElement = document.querySelector<HTMLCanvasElement>("#map-canvas");
const statusElement = document.querySelector<HTMLDivElement>("#status");
const debugPanelElement = document.querySelector<HTMLDivElement>("#debug-panel");
const regenerateElement = document.querySelector<HTMLButtonElement>("#regenerate");
if (!canvasElement || !statusElement || !debugPanelElement || !regenerateElement) throw new Error("Missing UI element");

const canvas = canvasElement;
const status = statusElement;
const debugPanel = debugPanelElement;
const regenerate = regenerateElement;
const engine = new Engine(canvas, true, { antialias: true, preserveDrawingBuffer: true });
let disposeScene: (() => void) | null = null;

async function loadDefaultMap(): Promise<void> {
  status.textContent = "Generating server map...";
  disposeScene?.();
  const artifact = await generateAndLoadMap();
  const sceneHandle = createMapScene(engine, canvas, artifact, {
    onHover: (tile) => {
      const worldHeight = tile ? tile.elevation * artifact.renderHints.heightScale : 0;
      debugPanel.textContent = tile
        ? `q=${tile.q} r=${tile.r}
base=${tile.baseTerrain}
relief=${tile.elevationClass}
veg=${tile.vegetation}
wetland=${tile.wetland}
biome=${tile.biome}
elev=${tile.elevation.toFixed(3)}
heightY=${worldHeight.toFixed(3)}
heightScale=${artifact.renderHints.heightScale.toFixed(2)}
waterLevel=${artifact.renderHints.waterLevel.toFixed(3)}
resources=${tile.resources?.map((resource) => resource.resourceId).join(", ") ?? "none"}`
        : "No tile";
    },
    onSelect: (tile) => {
      status.textContent = tile ? `Selected ${tile.id} ${tile.baseTerrain}` : "No selection";
    }
  });
  disposeScene = sceneHandle.dispose;
  engine.runRenderLoop(sceneHandle.render);
  status.textContent = `${artifact.tiles.length} tiles loaded`;
}

regenerate.addEventListener("click", () => {
  loadDefaultMap().catch((error) => {
    console.error(error);
    status.textContent = "Map load failed";
  });
});

window.addEventListener("resize", () => engine.resize());

loadDefaultMap().catch((error) => {
  console.error(error);
  status.textContent = "Map load failed";
});
