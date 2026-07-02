import { Matrix } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact, MapTile } from "../../../../shared/src/map";
import { worldToHex } from "../../../../shared/src/map";
import type { MapLookup } from "../data/mapLookup";

export function pickHexFromPointer(scene: Scene, artifact: GeneratedMapArtifact, lookup: MapLookup): MapTile | null {
  const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), scene.activeCamera);
  if (Math.abs(ray.direction.y) < 1e-6) return null;

  const t = -ray.origin.y / ray.direction.y;
  if (t < 0) return null;

  const hit = ray.origin.add(ray.direction.scale(t));
  const hex = worldToHex(hit.x, hit.z, artifact.layout);
  return lookup.getTile(hex.q, hex.r);
}
