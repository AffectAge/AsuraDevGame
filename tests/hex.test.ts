import { describe, expect, it } from "vitest";
import { AXIAL_DIRECTIONS, createRectangleCoords, hexDistance, hexLineDraw, hexRange, hexRing, hexToWorld, neighbor, worldToHex } from "../shared/src/map";

describe("hex math", () => {
  it("uses the expected flat-top axial directions", () => {
    expect(AXIAL_DIRECTIONS).toEqual([
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 }
    ]);
  });

  it("calculates neighbors and distance", () => {
    expect(neighbor({ q: 1, r: -2 }, 2)).toEqual({ q: 1, r: -3 });
    expect(hexDistance({ q: 3, r: -7 }, { q: 0, r: 0 })).toBe(7);
  });

  it("roundtrips hex to world coordinates", () => {
    const layout = { orientation: "flatTop" as const, hexSize: 1, origin: { x: 0, z: 0 } };
    for (const coord of createRectangleCoords(8, 8)) {
      const world = hexToWorld(coord.q, coord.r, layout);
      expect(worldToHex(world.x, world.z, layout)).toEqual(coord);
    }
  });

  it("draws red blob baseline line", () => {
    expect(hexLineDraw({ q: 0, r: 0 }, { q: 1, r: -5 })).toEqual([
      { q: 0, r: 0 },
      { q: 0, r: -1 },
      { q: 0, r: -2 },
      { q: 1, r: -3 },
      { q: 1, r: -4 },
      { q: 1, r: -5 }
    ]);
  });

  it("returns rings around a center", () => {
    expect(hexRing({ q: 0, r: 0 }, 0)).toEqual([{ q: 0, r: 0 }]);
    expect(hexRing({ q: 0, r: 0 }, 1)).toHaveLength(6);
    expect(hexRing({ q: 0, r: 0 }, 2)).toHaveLength(12);
    expect(hexRing({ q: 0, r: 0 }, 2).every((hex) => hexDistance({ q: 0, r: 0 }, hex) === 2)).toBe(true);
  });

  it("returns all hexes in a range", () => {
    for (const radius of [0, 1, 2, 3]) {
      const range = hexRange({ q: 3, r: -2 }, radius);
      expect(range).toHaveLength(1 + 3 * radius * (radius + 1));
      expect(range.every((hex) => hexDistance({ q: 3, r: -2 }, hex) <= radius)).toBe(true);
    }
  });
});
