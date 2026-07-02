import { ArcRotateCamera, Color3, DirectionalLight, HemisphericLight, Vector3 } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { HexCell, HexGridArtifact } from "../../../../shared/src";
import { MapLookup } from "../data/MapLookup";
import { pickCellFromPointer } from "../hex/picking";
import { createTerrainMesh } from "../render/TerrainMesh";
import { createTerrainMaterial } from "../render/terrainMaterial";

type SceneCallbacks = {
  onHover(cell: HexCell | null): void;
};

export function createAncestorsScene(engine: Engine, canvas: HTMLCanvasElement, artifact: HexGridArtifact, callbacks: SceneCallbacks): { render(): void; dispose(): void } {
  const scene = new Scene(engine);
  scene.clearColor.set(0.42, 0.39, 0.35, 1);
  scene.ambientColor = new Color3(0.55, 0.55, 0.55);

  const centerX = (artifact.bounds.worldMinX + artifact.bounds.worldMaxX) * 0.5;
  const centerZ = (artifact.bounds.worldMinZ + artifact.bounds.worldMaxZ) * 0.5;
  const camera = new ArcRotateCamera("camera", -Math.PI / 3, Math.PI / 3.4, Math.max(artifact.bounds.width, artifact.bounds.height) * 15, new Vector3(centerX, 5, centerZ), scene);
  camera.attachControl(canvas, true);
  camera.lowerBetaLimit = 0.35;
  camera.upperBetaLimit = 1.35;
  camera.wheelPrecision = 25;

  const hemi = new HemisphericLight("hemispheric-light", new Vector3(0.25, 1, 0.35), scene);
  hemi.intensity = 0.86;
  hemi.groundColor = new Color3(0.28, 0.25, 0.22);
  const sun = new DirectionalLight("sun-light", new Vector3(-0.45, -1, -0.35), scene);
  sun.intensity = 0.72;

  const lookup = new MapLookup(artifact);
  const terrain = createTerrainMesh(scene, artifact, lookup);
  terrain.material = createTerrainMaterial(scene);

  const pointerObserver = scene.onPointerObservable.add(() => {
    callbacks.onHover(pickCellFromPointer(scene, lookup));
  });

  return {
    render() {
      scene.render();
    },
    dispose() {
      scene.onPointerObservable.remove(pointerObserver);
      scene.dispose();
    }
  };
}
