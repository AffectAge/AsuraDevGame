import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { Scene } from "@babylonjs/core";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { GeneratedMapArtifact, MapTile } from "../../../../shared/src/map";
import { MapLookup } from "../data/mapLookup";
import { CameraController } from "../interaction/CameraController";
import { HoverController } from "../interaction/HoverController";
import { MapInputController } from "../interaction/MapInputController";
import { SelectionController } from "../interaction/SelectionController";
import { createBorderMeshLayer } from "../render/BorderMeshLayer";
import { HighlightLayer } from "../render/HighlightLayer";
import { createPropLayer } from "../render/PropLayer";
import { createRegionOverlayLayer } from "../render/RegionOverlayLayer";
import { createRiverMeshLayer } from "../render/RiverMeshLayer";
import { RoutePreviewLayer } from "../render/RoutePreviewLayer";
import { createTerrainMeshLayer } from "../render/TerrainMeshLayer";
import { createWaterMeshLayer } from "../render/WaterMeshLayer";
import { createLighting } from "./createLighting";
import { createMapCamera } from "./createMapCamera";

type SceneCallbacks = {
  onHover(tile: MapTile | null): void;
  onSelect(tile: MapTile | null): void;
};

export function createMapScene(engine: Engine, canvas: HTMLCanvasElement, artifact: GeneratedMapArtifact, callbacks: SceneCallbacks): { render(): void; dispose(): void } {
  const scene = new Scene(engine);
  scene.clearColor.set(0.07, 0.09, 0.1, 1);
  const lookup = new MapLookup(artifact);
  const camera = createMapCamera(scene, canvas, artifact);

  createLighting(scene);
  createTerrainMeshLayer(scene, artifact);
  createWaterMeshLayer(scene, artifact);
  createRegionOverlayLayer(scene, artifact);
  createPropLayer(scene, artifact);
  createBorderMeshLayer(scene, artifact);
  createRiverMeshLayer(scene, artifact);
  const highlight = new HighlightLayer(scene, artifact);
  const routePreview = new RoutePreviewLayer(scene, artifact);
  const hover = new HoverController(highlight, callbacks.onHover);
  const selection = new SelectionController(highlight, callbacks.onSelect);
  const input = new MapInputController({
    scene,
    artifact,
    lookup,
    hover,
    selection,
    routePreview
  });
  const cameraController = new CameraController({ scene, camera, canvas, artifact });

  return {
    render() {
      scene.render();
    },
    dispose() {
      input.dispose();
      cameraController.dispose();
      scene.dispose();
    }
  };
}
