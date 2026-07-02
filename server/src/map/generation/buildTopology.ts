import {
  AXIAL_DIRECTIONS,
  type Axial,
  type HexDirection,
  MapTopology,
  type TileEdge,
  tileId
} from "../../../../shared/src/map";

export type TopologySeed = {
  neighborsByTileId: Record<string, string[]>;
  edgesByTileId: Record<string, TileEdge[]>;
};

export function buildTopology(coords: Axial[]): TopologySeed {
  const mapTopology = new MapTopology({ wraparound: false, coords });
  const neighborsByTileId: Record<string, string[]> = {};
  const edgesByTileId: Record<string, TileEdge[]> = {};

  for (const coord of coords) {
    const id = tileId(coord.q, coord.r);
    neighborsByTileId[id] = [];
    edgesByTileId[id] = [];

    AXIAL_DIRECTIONS.forEach((_, index) => {
      const dir = index as HexDirection;
      const n = mapTopology.getNeighbor(coord, dir);
      const neighborId = n ? tileId(n.q, n.r) : null;
      if (neighborId) {
        neighborsByTileId[id].push(neighborId);
      }
      edgesByTileId[id].push({
        dir,
        neighborId,
        edgeTypes: neighborId ? ["same"] : ["mapEdge"],
        primaryEdgeType: neighborId ? "same" : "mapEdge",
        noiseSeed: index + coord.q * 4099 + coord.r * 9176,
        noiseAmplitude: 0.08,
        noiseWavelength: 0.5
      });
    });
  }

  return { neighborsByTileId, edgesByTileId };
}
