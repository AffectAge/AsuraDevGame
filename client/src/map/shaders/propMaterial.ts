import { Color3, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createPropMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.05, 0.05, 0.05);
  return material;
}
