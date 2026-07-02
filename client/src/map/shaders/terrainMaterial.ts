import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createTerrainMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial("terrain-material", scene);
  material.diffuseColor = new Color3(1, 1, 1);
  material.specularColor = new Color3(0.04, 0.04, 0.04);
  return material;
}
