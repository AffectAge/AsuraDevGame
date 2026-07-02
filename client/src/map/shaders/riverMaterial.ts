import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createRiverMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial("river-material", scene);
  material.diffuseColor = new Color3(0.12, 0.46, 0.82);
  material.emissiveColor = new Color3(0.04, 0.16, 0.24);
  material.specularColor = new Color3(0.3, 0.55, 0.75);
  return material;
}
