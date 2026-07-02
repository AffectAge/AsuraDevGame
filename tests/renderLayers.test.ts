import { NullEngine, Scene } from "@babylonjs/core";
import { describe, expect, it } from "vitest";
import { generateMap } from "../server/src/map";
import { defaultMapSettings } from "../shared/src/map";
import { createBorderMeshLayer } from "../client/src/map/render/BorderMeshLayer";
import { createRegionOverlayLayer } from "../client/src/map/render/RegionOverlayLayer";
import { createRiverMeshLayer } from "../client/src/map/render/RiverMeshLayer";
import { createTerrainMeshLayer } from "../client/src/map/render/TerrainMeshLayer";
import { createWaterMeshLayer } from "../client/src/map/render/WaterMeshLayer";

describe("Babylon render layers", () => {
  it("builds non-empty batched terrain, water, region, border, and river geometry", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const artifact = generateMap({
      ...defaultMapSettings,
      seed: "render-layer-smoke",
      width: 32,
      height: 24,
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

    const terrain = createTerrainMeshLayer(scene, artifact);
    const water = createWaterMeshLayer(scene, artifact);
    const region = createRegionOverlayLayer(scene, artifact);
    const river = createRiverMeshLayer(scene, artifact);
    createBorderMeshLayer(scene, artifact);

    expect(terrain.getTotalVertices()).toBeGreaterThan(0);
    expect(water.getTotalVertices()).toBeGreaterThan(0);
    expect(region.getTotalVertices()).toBeGreaterThan(0);
    expect(river?.getTotalVertices()).toBeGreaterThan(0);
    expect(scene.getMeshByName("coast-borders") ?? scene.getMeshByName("region-borders") ?? scene.getMeshByName("mapEdge-borders")).not.toBeNull();

    scene.dispose();
    engine.dispose();
  });
});
