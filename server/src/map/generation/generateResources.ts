import type { MapGenerationSettings } from "../../../../shared/src/map";
import type { DraftTile } from "./draftTypes";
import { octaveNoise } from "./rng";

export function generateResources(tiles: DraftTile[], settings: MapGenerationSettings): void {
  if (!settings.resources.enabled) return;

  for (const tile of tiles) {
    if (tile.isWater || tile.elevationClass === "mountains") continue;
    const rolls = {
      strategic: octaveNoise(`${settings.seed}:resource:strategic`, tile.q * 0.31, tile.r * 0.31, 2),
      luxury: octaveNoise(`${settings.seed}:resource:luxury`, tile.q * 0.16, tile.r * 0.16, 2),
      bonus: octaveNoise(`${settings.seed}:resource:bonus`, tile.q * 0.41, tile.r * 0.41, 2)
    };

    const resources: NonNullable<DraftTile["resources"]> = [];
    if (isStrategicCandidate(tile) && rolls.strategic > 1 - settings.resources.strategicDensity * 0.16) {
      resources.push({ resourceId: chooseStrategicResource(tile), category: "strategic", amount: 1 });
    }
    if (isLuxuryCandidate(tile) && rolls.luxury > 1 - settings.resources.luxuryDensity * 0.12) {
      resources.push({ resourceId: chooseLuxuryResource(tile), category: "luxury", amount: 1 });
    }
    if (isBonusCandidate(tile) && rolls.bonus > 1 - settings.resources.bonusDensity * 0.22) {
      resources.push({ resourceId: chooseBonusResource(tile), category: "bonus", amount: 1 });
    }

    if (resources.length > 0) {
      tile.resources = resources;
    }
  }
}

function isStrategicCandidate(tile: DraftTile): boolean {
  return tile.elevationClass === "hills" || tile.baseTerrain === "desert" || tile.baseTerrain === "tundra" || tile.baseTerrain === "snow";
}

function isLuxuryCandidate(tile: DraftTile): boolean {
  return tile.baseTerrain === "grassland" || tile.baseTerrain === "desert" || tile.vegetation !== "none" || tile.wetland === "marsh";
}

function isBonusCandidate(tile: DraftTile): boolean {
  return tile.baseTerrain === "plains" || tile.baseTerrain === "grassland" || tile.vegetation !== "none" || tile.wetland === "marsh";
}

function chooseStrategicResource(tile: DraftTile): string {
  if (tile.baseTerrain === "desert") return "oil";
  if (tile.baseTerrain === "tundra" || tile.baseTerrain === "snow") return "iron";
  return tile.elevationClass === "hills" ? "copper" : "horses";
}

function chooseLuxuryResource(tile: DraftTile): string {
  if (tile.baseTerrain === "desert") return "gems";
  if (tile.wetland === "marsh") return "spices";
  if (tile.vegetation === "rainforest") return "cocoa";
  if (tile.vegetation === "forest") return "furs";
  return "wine";
}

function chooseBonusResource(tile: DraftTile): string {
  if (tile.vegetation !== "none") return "deer";
  if (tile.wetland === "marsh") return "rice";
  if (tile.baseTerrain === "grassland") return "wheat";
  return "cattle";
}
