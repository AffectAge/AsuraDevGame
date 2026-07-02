import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createHighlightMaterial(scene: Scene, name: string, color: Color3, alpha: number): StandardMaterial {
  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = color;
  material.emissiveColor = color;
  material.alpha = alpha;
  return material;
}
