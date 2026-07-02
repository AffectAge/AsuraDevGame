import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/src/app";
import { classifyEdge, generateMap } from "../server/src/map/generateMap";

describe("map generation", () => {
  it("generates deterministic default artifacts", () => {
    expect(generateMap()).toEqual(generateMap());
  });

  it("classifies elevation edges like Catlike flat/slope/cliff", () => {
    expect(classifyEdge(2, 2)).toBe("flat");
    expect(classifyEdge(2, 3)).toBe("slope");
    expect(classifyEdge(2, 4)).toBe("cliff");
  });

  it("creates edges whose neighbor ids point to existing cells or null", () => {
    const artifact = generateMap({ width: 8, height: 6, seed: "edge-test" });
    const ids = new Set(artifact.cells.map((cell) => cell.id));
    for (const edges of Object.values(artifact.edgesByCellId)) {
      expect(edges).toHaveLength(6);
      for (const edge of edges) {
        expect(edge.neighborId === null || ids.has(edge.neighborId)).toBe(true);
      }
    }
  });

  it("serves a generated artifact through the API", async () => {
    const response = await request(createApp()).post("/api/maps/generate").send({ seed: "api-test", width: 5, height: 4 }).expect(200);
    expect(response.body.cells).toHaveLength(20);
    expect(response.body.edgesByCellId["0,0"]).toHaveLength(6);
  });
});
