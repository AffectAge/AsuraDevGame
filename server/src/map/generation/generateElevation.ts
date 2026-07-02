import type { MapGenerationSettings } from "../../../../shared/src/map";
import type { NoiseFields } from "./generateNoiseFields";
import { clamp01 } from "./rng";

export function generateElevation(fields: NoiseFields, settings: MapGenerationSettings): number {
  const roughness = settings.worldAge === "young" ? 1.16 : settings.worldAge === "old" ? 0.86 : 1;
  const continentMask = settings.landmass.mode === "pangaea" ? 0.2 : settings.landmass.mode === "archipelago" ? 0.44 : 0.32;
  return clamp01(fields.elevationNoise * roughness + fields.ridgeNoise * 0.12 - fields.edgeFalloff * continentMask);
}
