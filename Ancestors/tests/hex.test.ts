import { describe, expect, it } from "vitest";
import { ELEVATION_STEP, fromOffsetCoordinates, neighborOffset, offsetToWorld, terraceLerp } from "../shared/src";

describe("hex coordinates and metrics", () => {
  it("converts offset coordinates to cube coordinates with invariant x + y + z = 0", () => {
    const coord = fromOffsetCoordinates(3, 5);
    expect(coord).toEqual({ x: 1, y: -6, z: 5 });
    expect(coord.x + coord.y + coord.z).toBe(0);
  });

  it("finds offset neighbors using cube directions", () => {
    expect(neighborOffset({ x: 3, z: 4 }, 0)).toEqual({ x: 4, z: 4 });
    expect(neighborOffset({ x: 3, z: 4 }, 3)).toEqual({ x: 2, z: 4 });
  });

  it("positions rows with Catlike rectangular offset spacing", () => {
    const a = offsetToWorld(0, 0);
    const b = offsetToWorld(1, 0);
    const c = offsetToWorld(0, 1);
    expect(b.x - a.x).toBeCloseTo(17.32050808, 5);
    expect(c.z - a.z).toBeCloseTo(15, 5);
  });

  it("interpolates terrace y only on odd step pairs", () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 10, y: ELEVATION_STEP, z: 0 };
    expect(terraceLerp(a, b, 1).y).toBeCloseTo(1);
    expect(terraceLerp(a, b, 2).y).toBeCloseTo(1);
    expect(terraceLerp(a, b, 3).y).toBeCloseTo(2);
  });
});
