import { Matrix, Plane } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import { worldToOffset, type HexCell } from "../../../../shared/src";
import type { MapLookup } from "../data/MapLookup";

const groundPlane = new Plane(0, 1, 0, 0);

export function pickCellFromPointer(scene: Scene, lookup: MapLookup): HexCell | null {
  if (!scene.activeCamera) return null;
  const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), scene.activeCamera);
  const distance = ray.intersectsPlane(groundPlane);
  if (distance === null) return null;
  const point = ray.origin.add(ray.direction.scale(distance));
  const offset = worldToOffset(point.x, point.z);
  return lookup.getByOffset(offset.x, offset.z);
}
