import {
  type Axial,
  type MapGenerationSettings,
  tileId
} from "../../../../shared/src/map";
import { classifyBaseTerrain, classifyBiome } from "./classifyTerrain";
import type { DraftTile } from "./draftTypes";
import type { Rng } from "./rng";
import { generateElevation } from "./generateElevation";
import { generateClimate } from "./generateClimate";
import { generateNoiseFields } from "./generateNoiseFields";

export function generateBaseTiles(coords: Axial[], settings: MapGenerationSettings, rng: Rng, seaThreshold: number): DraftTile[] {
  const noiseFields = generateNoiseFields(coords, settings);
  return coords.map(({ q, r }) => {
    const id = tileId(q, r);
    const fields = noiseFields.get(id);
    if (!fields) throw new Error(`Missing noise fields for ${id}`);
    const elevation = generateElevation(fields, settings);
    const climate = generateClimate(fields, settings, elevation);
    const isWater = elevation < seaThreshold;
    const baseTerrain = isWater ? "ocean" : classifyBaseTerrain(elevation, climate.moisture, climate.temperature);
    const biome = classifyBiome(climate.moisture, climate.temperature, elevation, isWater);
    const elevationClass = isWater ? "flat" : elevation > 0.78 ? "mountains" : elevation > 0.63 ? "hills" : "flat";
    const vegetation = isWater || climate.moisture < 0.52 ? "none" : climate.temperature > 0.68 ? "rainforest" : "forest";
    const wetland = !isWater && elevationClass === "flat" && climate.moisture > 0.82 ? "marsh" : "none";

    return {
      id,
      q,
      r,
      baseTerrain,
      elevationClass,
      vegetation,
      wetland,
      biome,
      elevation,
      moisture: climate.moisture,
      temperature: climate.temperature,
      isWater,
      isCoastal: false,
      isLake: false,
      isRiver: false,
      movementCost: isWater ? 99 : elevationClass === "mountains" ? 4 : elevationClass === "hills" ? 2 : wetland === "marsh" ? 3 : 1,
      passable: !isWater && elevationClass !== "mountains",
      regionIds: [],
      visual: {
        terrainVariant: Math.floor(rng.next() * 4),
        colorJitter: rng.range(-0.08, 0.08)
      }
    };
  });
}

export function seaLevelThreshold(settings: MapGenerationSettings): number {
  if (settings.seaLevel === "low") return 0.42;
  if (settings.seaLevel === "high") return 0.56;
  return 0.49;
}
