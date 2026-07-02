import type { MapGenerationSettings } from "../../../../shared/src/map";
import type { DraftTile } from "./draftTypes";
import { octaveNoise } from "./rng";

export function generateLakes(tiles: DraftTile[], settings: MapGenerationSettings): void {
  if (!settings.lakes.enabled) return;
  let lakeCount = 0;
  for (const tile of tiles) {
    if (tile.isWater) continue;
    const basin = octaveNoise(`${settings.seed}:lake`, tile.q * 0.18, tile.r * 0.18, 3);
    if (tile.elevation < 0.58 && tile.moisture > 0.72 && basin > 1 - settings.lakes.density * 0.22) {
      makeLake(tile);
      lakeCount += 1;
    }
  }

  if (lakeCount === 0 && settings.lakes.density > 0) {
    const bestBasin = tiles
      .filter((tile) => !tile.isWater)
      .sort((a, b) => b.moisture - a.moisture || a.elevation - b.elevation)[0];
    if (bestBasin) makeLake(bestBasin);
  }
}

function makeLake(tile: DraftTile): void {
  tile.baseTerrain = "lake";
  tile.isWater = true;
  tile.isLake = true;
  tile.passable = false;
  tile.movementCost = 99;
  tile.elevationClass = "flat";
  tile.vegetation = "none";
  tile.wetland = "none";
}
