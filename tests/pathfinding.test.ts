import { describe, expect, it } from "vitest";
import { defaultMapSettings, findRoute } from "../shared/src/map";
import { generateMap } from "../server/src/map";

describe("route preview pathfinding", () => {
  it("finds a route using artifact topology and movement costs", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "route-test",
      width: 24,
      height: 18,
      seaLevel: "low"
    });
    const start = map.tiles.find((tile) => {
      if (!tile.passable || tile.isWater) return false;
      return (map.topology.neighborsByTileId[tile.id] ?? []).some((id) => {
        const neighbor = map.tiles.find((candidate) => candidate.id === id);
        return neighbor?.passable && !neighbor.isWater;
      });
    });
    const goalId = start
      ? (map.topology.neighborsByTileId[start.id] ?? []).find((id) => {
          const neighbor = map.tiles.find((candidate) => candidate.id === id);
          return neighbor?.passable && !neighbor.isWater;
        })
      : undefined;
    const goal = goalId ? map.tiles.find((tile) => tile.id === goalId) : undefined;
    expect(start).toBeTruthy();
    expect(goal).toBeTruthy();
    if (!start || !goal) throw new Error("Expected adjacent passable route endpoints");
    const route = findRoute(map, start.id, goal.id);
    expect(route).toBeTruthy();
    expect(route?.tileIds[0]).toBe(start.id);
    expect(route?.tileIds.at(-1)).toBe(goal.id);
    expect(route?.totalCost).toBeGreaterThan(0);
  });

  it("does not route into impassable water tiles", () => {
    const map = generateMap({
      ...defaultMapSettings,
      seed: "route-water-test",
      width: 24,
      height: 18,
      seaLevel: "high"
    });
    const start = map.tiles.find((tile) => tile.passable && !tile.isWater);
    const water = map.tiles.find((tile) => tile.isWater);
    expect(start).toBeTruthy();
    expect(water).toBeTruthy();
    expect(findRoute(map, start!.id, water!.id)).toBeNull();
  });
});
