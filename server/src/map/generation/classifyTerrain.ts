import type { BaseTerrainId, BiomeId } from "../../../../shared/src/map";

export function classifyBaseTerrain(elevation: number, moisture: number, temperature: number): BaseTerrainId {
  if (temperature < 0.18) return "snow";
  if (temperature < 0.32) return "tundra";
  if (moisture < 0.28 && temperature > 0.48) return "desert";
  if (moisture > 0.58) return "grassland";
  return elevation > 0.7 ? "tundra" : "plains";
}

export function classifyBiome(moisture: number, temperature: number, elevation: number, isWater: boolean): BiomeId {
  if (isWater) return "wetland";
  if (temperature < 0.28 || elevation > 0.82) return "cold";
  if (moisture < 0.3) return "arid";
  if (temperature > 0.66 && moisture > 0.56) return "tropical";
  if (temperature < 0.45) return "boreal";
  if (moisture > 0.78) return "wetland";
  return "temperate";
}
