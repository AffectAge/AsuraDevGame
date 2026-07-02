import type { Axial, MapGenerationSettings } from "../../../../shared/src/map";
import { createRectangleCoords } from "../../../../shared/src/map";

export function createCoordinateSet(settings: MapGenerationSettings): Axial[] {
  if (settings.shape !== "rectangle") {
    throw new Error(`Unsupported map shape: ${settings.shape}`);
  }
  return createRectangleCoords(settings.width, settings.height);
}
