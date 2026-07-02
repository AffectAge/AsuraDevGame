import { describe, expect, it } from "vitest";
import type { DeterministicMapContent } from "../shared/src/map";
import { defaultMapSettings } from "../shared/src/map";
import { generateMap } from "../server/src/map";
import { validateArtifact } from "../server/src/map/generation/validateArtifact";

function deterministicContent(map: ReturnType<typeof generateMap>): DeterministicMapContent {
  return {
    generatorVersion: map.generatorVersion,
    seed: map.seed,
    settings: map.settings,
    layout: map.layout,
    bounds: map.bounds,
    tiles: map.tiles,
    topology: map.topology,
    regions: map.regions,
    rivers: map.rivers,
    borders: map.borders,
    renderHints: map.renderHints
  };
}

describe("map generation", () => {
  it("generates deterministic map content for same settings and generator version", () => {
    const a = generateMap(defaultMapSettings);
    const b = generateMap(defaultMapSettings);
    expect(a.id).not.toEqual(b.id);
    expect(a.metadata.createdAt).toBeTypeOf("string");
    expect(a.deterministicHash).toMatch(/^[a-f0-9]{64}$/);
    expect(a.deterministicHash).toBe(b.deterministicHash);
    expect(deterministicContent(a)).toEqual(deterministicContent(b));
  });

  it("changes deterministic hash when deterministic settings change", () => {
    const a = generateMap({ ...defaultMapSettings, seed: "hash-a" });
    const b = generateMap({ ...defaultMapSettings, seed: "hash-b" });
    expect(a.deterministicHash).not.toBe(b.deterministicHash);
  });

  it("generates expected rectangle size and topology", () => {
    const map = generateMap({ ...defaultMapSettings, width: 12, height: 10 });
    expect(map.tiles).toHaveLength(120);
    expect(map.topology.neighborsByTileId["0,0"]).toContain("1,0");
    expect(map.topology.edgesByTileId["0,0"].some((edge) => edge.edgeTypes.includes("mapEdge"))).toBe(true);
  });

  it("detects coast after all water including lakes is finalized", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "lake-coast-test",
      width: 32,
      height: 24,
      lakes: { enabled: true, density: 1 }
    });
    const lake = map.tiles.find((tile) => tile.isLake);
    expect(lake).toBeTruthy();
    expect(map.tiles.some((tile) => !tile.isWater && tile.isCoastal)).toBe(true);
  });

  it("does not put fallback generation code in client entry", async () => {
    const fs = await import("node:fs/promises");
    const entry = await fs.readFile("client/src/main.ts", "utf8");
    expect(entry).not.toMatch(/generateMap\(/);
    expect(entry).not.toMatch(/fallback/i);
  });

  it("validates generated artifacts and rejects corrupted topology", () => {
    const map = generateMap({ ...defaultMapSettings, width: 16, height: 12 });
    expect(() => validateArtifact(map)).not.toThrow();
    const corrupted = structuredClone(map);
    corrupted.topology.edgesByTileId["0,0"][0].edgeTypes = [];
    expect(() => validateArtifact(corrupted)).toThrow(/edgeTypes/);
    const corruptedHash = structuredClone(map);
    corruptedHash.deterministicHash = "0".repeat(64);
    expect(() => validateArtifact(corruptedHash)).toThrow(/deterministicHash/);
  });

  it("places deterministic resources only on valid non-water terrain when enabled", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "resource-test",
      width: 48,
      height: 32,
      resources: {
        enabled: true,
        strategicDensity: 1,
        luxuryDensity: 1,
        bonusDensity: 1
      }
    });
    const resourceTiles = map.tiles.filter((tile) => tile.resources && tile.resources.length > 0);
    expect(resourceTiles.length).toBeGreaterThan(0);
    expect(resourceTiles.every((tile) => !tile.isWater && tile.elevationClass !== "mountains")).toBe(true);
    expect(deterministicContent(map)).toEqual(
      deterministicContent(
        generateMap({
          ...defaultMapSettings,
          seed: "resource-test",
          width: 48,
          height: 32,
          resources: {
            enabled: true,
            strategicDensity: 1,
            luxuryDensity: 1,
            bonusDensity: 1
          }
        })
      )
    );
  });

  it("generates edge and corner based rivers when enabled", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "river-drainage-test",
      width: 48,
      height: 32,
      seaLevel: "low",
      rainfall: "wet",
      landmass: {
        ...defaultMapSettings.landmass,
        mode: "pangaea"
      },
      rivers: {
        enabled: true,
        density: 1
      }
    });
    expect(map.rivers.length).toBeGreaterThan(0);
    expect(map.rivers.every((river) => /:c[0-5]$/.test(river.fromCorner) && /:c[0-5]$/.test(river.toCorner))).toBe(true);
    expect(map.rivers.every((river) => river.flow > 0 && river.width > 0 && river.strahler >= 1)).toBe(true);

    const riverEdges = Object.values(map.topology.edgesByTileId)
      .flat()
      .filter((edge) => edge.riverId);
    expect(riverEdges.length).toBeGreaterThan(0);
    expect(riverEdges.every((edge) => edge.edgeTypes.includes("river"))).toBe(true);
    expect(map.borders.some((border) => border.type === "river")).toBe(true);
  });
});
