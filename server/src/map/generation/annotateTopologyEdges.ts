import type { EdgeType, TileEdge } from "../../../../shared/src/map";
import type { DraftTile } from "./draftTypes";

export function annotateTopologyEdges(edgesByTileId: Record<string, TileEdge[]>, tiles: DraftTile[]): void {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));

  for (const [id, edges] of Object.entries(edgesByTileId)) {
    const tile = byId.get(id);
    if (!tile) continue;
    for (const edge of edges) {
      const types = new Set<EdgeType>();
      if (!edge.neighborId) {
        types.add("mapEdge");
      } else {
        const neighbor = byId.get(edge.neighborId);
        if (!neighbor) {
          types.add("mapEdge");
        } else {
          if (tile.isWater !== neighbor.isWater) types.add("coast");
          if (tile.regionIds.some((regionId) => !neighbor.regionIds.includes(regionId))) types.add("regionBorder");
          if (edge.riverId) types.add("river");
          if (tile.elevationClass === "mountains" || neighbor.elevationClass === "mountains") types.add("cliff");
          if (types.size === 0) types.add("same");
        }
      }
      edge.edgeTypes = [...types];
      edge.primaryEdgeType = edge.edgeTypes.includes("coast")
        ? "coast"
        : edge.edgeTypes.includes("river")
          ? "river"
          : edge.edgeTypes.includes("regionBorder")
            ? "regionBorder"
            : edge.edgeTypes[0];
    }
  }
}
