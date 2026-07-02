import type { DraftTile } from "./draftTypes";

export function detectCoasts(tiles: DraftTile[], neighborsByTileId: Record<string, string[]>): void {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  for (const tile of tiles) {
    const neighbors = neighborsByTileId[tile.id] ?? [];
    const hasWaterNeighbor = neighbors.some((id) => byId.get(id)?.isWater);
    const hasLandNeighbor = neighbors.some((id) => byId.get(id) && !byId.get(id)?.isWater);
    tile.isCoastal = (!tile.isWater && hasWaterNeighbor) || (tile.isWater && !tile.isLake && hasLandNeighbor);
    if (tile.isWater && tile.isCoastal && !tile.isLake) {
      tile.baseTerrain = "coast";
    }
  }
}
