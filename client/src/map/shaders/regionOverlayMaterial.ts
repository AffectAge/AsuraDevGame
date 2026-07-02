import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createRegionOverlayMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial("region-overlay-material", scene);
  material.diffuseColor = new Color3(1, 1, 1);
  material.emissiveColor = new Color3(0.08, 0.08, 0.08);
  material.alpha = 0.18;
  material.specularColor = new Color3(0, 0, 0);
  return material;
}
