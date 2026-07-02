import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";
import { MapLookup } from "../client/src/map/data/MapLookup";
import { createTerrainMesh } from "../client/src/map/render/TerrainMesh";
import { generateMap } from "../server/src/map/generateMap";
import { HEX_CORNERS, neighborOffset, offsetToWorld } from "../shared/src";

describe("Babylon terrain rendering", () => {
  it("creates one non-empty batched terrain mesh", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const artifact = generateMap({ width: 8, height: 6, seed: "render-test" });
    const mesh = createTerrainMesh(scene, artifact, new MapLookup(artifact));

    expect(mesh.name).toBe("hex-terrain");
    expect(mesh.getTotalVertices()).toBeGreaterThan(0);
    expect(mesh.isVerticesDataPresent("position")).toBe(true);
    expect(mesh.isVerticesDataPresent("color")).toBe(true);
    expect(scene.meshes.filter((candidate) => candidate.name === "hex-terrain")).toHaveLength(1);

    scene.dispose();
    engine.dispose();
  });

  it("keeps render edge order aligned with world-space neighbor directions", () => {
    const edgeDirections = [5, 0, 1, 2, 3, 4] as const;
    const center = offsetToWorld(5, 5);

    for (let edgeIndex = 0; edgeIndex < 6; edgeIndex += 1) {
      const direction = edgeDirections[edgeIndex];
      const neighbor = neighborOffset({ x: 5, z: 5 }, direction);
      const neighborCenter = offsetToWorld(neighbor.x, neighbor.z);
      const bridgeTarget = {
        x: center.x + HEX_CORNERS[edgeIndex].x + HEX_CORNERS[edgeIndex + 1].x,
        z: center.z + HEX_CORNERS[edgeIndex].z + HEX_CORNERS[edgeIndex + 1].z
      };

      expect(neighborCenter.x).toBeCloseTo(bridgeTarget.x, 5);
      expect(neighborCenter.z).toBeCloseTo(bridgeTarget.z, 5);
    }
  });
});
