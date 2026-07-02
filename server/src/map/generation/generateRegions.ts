import type { MapGenerationSettings, MapRegion } from "../../../../shared/src/map";
import type { DraftTile } from "./draftTypes";

export function generateRegions(tiles: DraftTile[], settings: MapGenerationSettings): MapRegion[] {
  const regions: MapRegion[] = [];
  const land = tiles.filter((tile) => !tile.isWater).map((tile) => tile.id);
  const ocean = tiles.filter((tile) => tile.isWater && !tile.isLake).map((tile) => tile.id);
  const lakes = tiles.filter((tile) => tile.isLake).map((tile) => tile.id);

  if (settings.regions.generateContinents && land.length > 0) {
    regions.push({ id: "region_land_0", type: "landmass", name: "Main Landmass", tileIds: land, visual: { colorIndex: 1, borderStyle: "hard" } });
  }
  if (settings.regions.generateSeas && ocean.length > 0) {
    regions.push({ id: "region_ocean_0", type: "ocean", name: "Ocean", tileIds: ocean, visual: { colorIndex: 2, borderStyle: "coast" } });
  }
  if (lakes.length > 0) {
    regions.push({ id: "region_lake_0", type: "lake", name: "Lakes", tileIds: lakes, visual: { colorIndex: 3, borderStyle: "coast" } });
  }
  if (settings.regions.generateClimateRegions) {
    regions.push(...generateClimateRegions(tiles));
  }
  if (settings.regions.generateProvinceRegions) {
    regions.push(...generateProvinceRegions(tiles));
  }

  const regionByTile = new Map<string, string[]>();
  for (const region of regions) {
    for (const tileId of region.tileIds) {
      const list = regionByTile.get(tileId) ?? [];
      list.push(region.id);
      regionByTile.set(tileId, list);
    }
  }
  for (const tile of tiles) {
    tile.regionIds = regionByTile.get(tile.id) ?? [];
  }

  return regions;
}

function generateClimateRegions(tiles: DraftTile[]): MapRegion[] {
  const climateTiles = new Map<string, string[]>();
  for (const tile of tiles) {
    const list = climateTiles.get(tile.biome) ?? [];
    list.push(tile.id);
    climateTiles.set(tile.biome, list);
  }

  return [...climateTiles.entries()]
    .filter(([, tileIds]) => tileIds.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([biome, tileIds], index) => ({
      id: `region_climate_${biome}`,
      type: "climate" as const,
      name: `${biome[0].toUpperCase()}${biome.slice(1)} Climate`,
      tileIds,
      visual: {
        colorIndex: 4 + index,
        borderStyle: "soft" as const
      }
    }));
}

function generateProvinceRegions(tiles: DraftTile[]): MapRegion[] {
  const landTiles = tiles.filter((tile) => !tile.isWater);
  if (landTiles.length === 0) return [];

  const qValues = [...new Set(landTiles.map((tile) => tile.q))].sort((a, b) => a - b);
  const rValues = [...new Set(landTiles.map((tile) => tile.r))].sort((a, b) => a - b);
  const qIndexByValue = new Map(qValues.map((q, index) => [q, index]));
  const rIndexByValue = new Map(rValues.map((r, index) => [r, index]));
  const qSpan = Math.max(1, qValues.length);
  const rSpan = Math.max(1, rValues.length);
  const targetProvinceCount = Math.max(2, Math.min(12, Math.round(Math.sqrt(landTiles.length / 32))));
  const qBuckets = Math.max(1, Math.round(Math.sqrt(targetProvinceCount * (qSpan / rSpan))));
  const rBuckets = Math.max(1, Math.ceil(targetProvinceCount / qBuckets));
  const provinceTiles = new Map<string, string[]>();

  for (const tile of landTiles) {
    const qIndex = qIndexByValue.get(tile.q) ?? 0;
    const rIndex = rIndexByValue.get(tile.r) ?? 0;
    const qBucket = Math.min(qBuckets - 1, Math.floor((qIndex / qSpan) * qBuckets));
    const rBucket = Math.min(rBuckets - 1, Math.floor((rIndex / rSpan) * rBuckets));
    const id = `region_province_${qBucket}_${rBucket}`;
    const list = provinceTiles.get(id) ?? [];
    list.push(tile.id);
    provinceTiles.set(id, list);
  }

  return [...provinceTiles.entries()]
    .filter(([, tileIds]) => tileIds.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, tileIds], index) => ({
      id,
      type: "province" as const,
      name: `Province ${index + 1}`,
      tileIds,
      visual: {
        colorIndex: 8 + index,
        borderStyle: "political" as const
      }
    }));
}
