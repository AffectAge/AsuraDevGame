import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createWaterMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial("water-material", scene);
  material.diffuseColor = new Color3(0.13, 0.38, 0.58);
  material.alpha = 0.82;
  material.specularColor = new Color3(0.45, 0.7, 0.82);
  return material;
}
