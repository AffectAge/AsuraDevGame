import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createTerrainTerraceMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial("terrain-terrace-material", scene);
  material.diffuseColor = new Color3(1, 1, 1);
  material.specularColor = new Color3(0.015, 0.015, 0.015);
  material.backFaceCulling = false;
  return material;
}
