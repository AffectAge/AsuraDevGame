import { describe, expect, it } from "vitest";
import { MapTopology, createRectangleCoords, tileId } from "../shared/src/map";
import { buildTopology } from "../server/src/map/generation/buildTopology";

describe("map topology", () => {
  it("normalizes only coordinates inside the map when wraparound is false", () => {
    const topology = new MapTopology({ wraparound: false, coords: createRectangleCoords(3, 3) });
    expect(topology.normalizeCoord({ q: 1, r: 1 })).toEqual({ q: 1, r: 1 });
    expect(topology.normalizeCoord({ q: -1, r: 1 })).toBeNull();
    expect(topology.normalizeCoord({ q: 3, r: 1 })).toBeNull();
  });

  it("returns null for non-wrapping map-edge neighbors", () => {
    const topology = new MapTopology({ wraparound: false, coords: createRectangleCoords(3, 3) });
    expect(topology.getNeighbor({ q: 0, r: 0 }, 3)).toBeNull();
    expect(topology.getNeighbor({ q: 0, r: 0 }, 0)).toEqual({ q: 1, r: 0 });
  });

  it("builds artifact topology with mapEdge for missing neighbors", () => {
    const topology = buildTopology(createRectangleCoords(3, 3));
    expect(topology.neighborsByTileId[tileId(0, 0)]).toContain(tileId(1, 0));
    expect(topology.edgesByTileId[tileId(0, 0)].some((edge) => edge.neighborId === null && edge.edgeTypes.includes("mapEdge"))).toBe(true);
  });
});
