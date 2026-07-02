import { HemisphericLight, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

export function createLighting(scene: Scene): void {
  new HemisphericLight("map-light", new Vector3(0.25, 1, 0.35), scene).intensity = 1.1;
}
