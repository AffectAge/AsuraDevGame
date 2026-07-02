import type { MapGenerationSettings } from "../../../../shared/src/map";
import type { NoiseFields } from "./generateNoiseFields";
import { clamp01 } from "./rng";

export type ClimateFields = {
  moisture: number;
  temperature: number;
};

export function generateClimate(fields: NoiseFields, settings: MapGenerationSettings, elevation: number): ClimateFields {
  const tempBias = settings.temperature === "cold" ? -0.14 : settings.temperature === "hot" ? 0.14 : 0;
  const rainBias = settings.rainfall === "dry" ? -0.16 : settings.rainfall === "wet" ? 0.16 : 0;
  return {
    moisture: clamp01(fields.moistureNoise + rainBias),
    temperature: clamp01(1 - fields.latitude * 0.75 - elevation * 0.2 + tempBias)
  };
}
