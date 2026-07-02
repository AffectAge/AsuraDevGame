import type { BaseTerrainId, BiomeId, MapRenderHints } from "../../../../shared/src/map";

const terrainPalette: Record<BaseTerrainId, string> = {
  ocean: "#1f5f8f",
  coast: "#3c8fb2",
  lake: "#2f75a3",
  plains: "#b8b36a",
  grassland: "#6fa35d",
  desert: "#d0b16a",
  tundra: "#96a88f",
  snow: "#d8dee2"
};

const biomeTints: Record<BiomeId, string> = {
  temperate: "#ffffff",
  boreal: "#dce8d7",
  tropical: "#d9ffd2",
  arid: "#fff0c4",
  cold: "#d8eaff",
  wetland: "#d9efe2"
};

export function buildRenderHints(seaThreshold: number): MapRenderHints {
  return {
    heightScale: 1.4,
    terrainPalette,
    biomeTints,
    waterLevel: seaThreshold * 1.4
  };
}
