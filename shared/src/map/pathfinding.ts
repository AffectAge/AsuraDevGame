import type { GeneratedMapArtifact, MapTile, TileId } from "./artifactTypes";
import { hexDistance } from "./hex";

export type RouteResult = {
  tileIds: TileId[];
  totalCost: number;
};

type QueueItem = {
  id: TileId;
  priority: number;
};

export function findRoute(artifact: GeneratedMapArtifact, startId: TileId, goalId: TileId): RouteResult | null {
  if (startId === goalId) {
    return { tileIds: [startId], totalCost: 0 };
  }

  const tiles = new Map(artifact.tiles.map((tile) => [tile.id, tile]));
  const start = tiles.get(startId);
  const goal = tiles.get(goalId);
  if (!start || !goal || !isRouteTile(start) || !isRouteTile(goal)) {
    return null;
  }

  const frontier: QueueItem[] = [{ id: startId, priority: 0 }];
  const cameFrom = new Map<TileId, TileId | null>([[startId, null]]);
  const costSoFar = new Map<TileId, number>([[startId, 0]]);

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.priority - b.priority);
    const current = frontier.shift();
    if (!current) break;
    if (current.id === goalId) break;

    for (const neighborId of artifact.topology.neighborsByTileId[current.id] ?? []) {
      const neighbor = tiles.get(neighborId);
      if (!neighbor || !isRouteTile(neighbor)) continue;
      const currentCost = costSoFar.get(current.id);
      if (currentCost === undefined) continue;
      const newCost = currentCost + neighbor.movementCost;
      const oldCost = costSoFar.get(neighborId);
      if (oldCost === undefined || newCost < oldCost) {
        costSoFar.set(neighborId, newCost);
        const priority = newCost + hexDistance(neighbor, goal);
        frontier.push({ id: neighborId, priority });
        cameFrom.set(neighborId, current.id);
      }
    }
  }

  if (!cameFrom.has(goalId)) {
    return null;
  }

  const path: TileId[] = [];
  let current: TileId | null = goalId;
  while (current) {
    path.push(current);
    current = cameFrom.get(current) ?? null;
  }
  path.reverse();
  return {
    tileIds: path,
    totalCost: costSoFar.get(goalId) ?? 0
  };
}

function isRouteTile(tile: MapTile): boolean {
  return tile.passable && !tile.isWater && Number.isFinite(tile.movementCost);
}
