import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createTerrainSideWallMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial("terrain-side-wall-material", scene);
  material.diffuseColor = new Color3(1, 1, 1);
  material.specularColor = new Color3(0.02, 0.02, 0.02);
  return material;
}
