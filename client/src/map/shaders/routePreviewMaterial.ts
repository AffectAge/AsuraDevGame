import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createRoutePreviewMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial("route-preview-material", scene);
  material.diffuseColor = new Color3(0.3, 0.78, 1);
  material.emissiveColor = new Color3(0.08, 0.24, 0.34);
  material.alpha = 0.42;
  return material;
}
