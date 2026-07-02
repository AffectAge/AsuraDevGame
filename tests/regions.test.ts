import { describe, expect, it } from "vitest";
import { generateMap } from "../server/src/map";
import { defaultMapSettings } from "../shared/src/map";
import type { MapGenerationSettings } from "../shared/src/map";

describe("map regions", () => {
  it("keeps region tile lists and tile regionIds in sync", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "region-sync-test",
      width: 32,
      height: 24
    });
    const tileIds = new Set(map.tiles.map((tile) => tile.id));
    const membership = new Map<string, string[]>();

    for (const region of map.regions) {
      expect(region.tileIds.length).toBeGreaterThan(0);
      for (const tileId of region.tileIds) {
        expect(tileIds.has(tileId)).toBe(true);
        const list = membership.get(tileId) ?? [];
        list.push(region.id);
        membership.set(tileId, list);
      }
    }

    for (const tile of map.tiles) {
      expect([...tile.regionIds].sort()).toEqual([...(membership.get(tile.id) ?? [])].sort());
    }
  });

  it("generates basic land and water regions for the vertical slice", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "region-basic-test",
      width: 32,
      height: 24
    });
    expect(map.regions.some((region) => region.type === "landmass")).toBe(true);
    expect(map.regions.some((region) => region.type === "ocean" || region.type === "lake")).toBe(true);
  });

  it("generates climate regions from tile biomes when enabled", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "region-climate-test",
      width: 32,
      height: 24,
      regions: {
        ...defaultMapSettings.regions,
        generateClimateRegions: true
      }
    });
    const climateRegions = map.regions.filter((region) => region.type === "climate");
    expect(climateRegions.length).toBeGreaterThan(0);

    const climateById = new Map(climateRegions.map((region) => [region.id, region]));
    for (const tile of map.tiles) {
      const climateId = `region_climate_${tile.biome}`;
      expect(tile.regionIds).toContain(climateId);
      expect(climateById.get(climateId)?.tileIds).toContain(tile.id);
    }
  });

  it("does not generate climate regions when disabled", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "region-no-climate-test",
      width: 24,
      height: 18,
      regions: {
        ...defaultMapSettings.regions,
        generateClimateRegions: false
      }
    });
    expect(map.regions.some((region) => region.type === "climate")).toBe(false);
  });

  it("generates deterministic province regions for land when enabled", () => {
    const settings = {
      ...defaultMapSettings,
      seed: "region-province-test",
      width: 40,
      height: 28,
      seaLevel: "low",
      landmass: {
        ...defaultMapSettings.landmass,
        mode: "pangaea"
      },
      regions: {
        ...defaultMapSettings.regions,
        generateProvinceRegions: true
      }
    } satisfies Partial<MapGenerationSettings>;
    const map = generateMap(settings);
    const repeat = generateMap(settings);
    const provinceRegions = map.regions.filter((region) => region.type === "province");
    expect(provinceRegions.length).toBeGreaterThan(1);
    expect(provinceRegions.map((region) => region.id)).toEqual(repeat.regions.filter((region) => region.type === "province").map((region) => region.id));

    const tilesById = new Map(map.tiles.map((tile) => [tile.id, tile]));
    for (const region of provinceRegions) {
      expect(region.visual.borderStyle).toBe("political");
      expect(region.tileIds.every((tileId) => tilesById.get(tileId)?.isWater === false)).toBe(true);
    }
  });

  it("marks province boundaries as region borders", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "region-province-border-test",
      width: 40,
      height: 28,
      seaLevel: "low",
      landmass: {
        ...defaultMapSettings.landmass,
        mode: "pangaea"
      },
      regions: {
        ...defaultMapSettings.regions,
        generateProvinceRegions: true
      }
    });
    const tileById = new Map(map.tiles.map((tile) => [tile.id, tile]));
    const provinceIdForTile = (tileId: string) => tileById.get(tileId)?.regionIds.find((regionId) => regionId.startsWith("region_province_"));
    const provinceBoundaryEdge = Object.entries(map.topology.edgesByTileId)
      .flatMap(([tileId, edges]) => edges.map((edge) => ({ tileId, edge })))
      .find(({ tileId, edge }) => {
        if (!edge.neighborId) return false;
        const provinceId = provinceIdForTile(tileId);
        const neighborProvinceId = provinceIdForTile(edge.neighborId);
        return provinceId !== undefined && neighborProvinceId !== undefined && provinceId !== neighborProvinceId;
      });

    expect(provinceBoundaryEdge).toBeDefined();
    expect(provinceBoundaryEdge?.edge.edgeTypes).toContain("regionBorder");
    expect(
      Object.values(map.topology.edgesByTileId)
        .flat()
        .some((edge) => edge.edgeTypes.includes("regionBorder"))
    ).toBe(true);
    expect(map.borders.some((border) => border.type === "region")).toBe(true);
  });
});
