import type { GeneratedMapArtifact } from "../../../../shared/src/map";
import { hexToWorld } from "../../../../shared/src/map";
import type { DraftTile } from "./draftTypes";

export function buildBounds(tiles: DraftTile[], layout: GeneratedMapArtifact["layout"]): GeneratedMapArtifact["bounds"] {
  const qs = tiles.map((tile) => tile.q);
  const rs = tiles.map((tile) => tile.r);
  const worlds = tiles.map((tile) => hexToWorld(tile.q, tile.r, layout));
  return {
    qMin: Math.min(...qs),
    qMax: Math.max(...qs),
    rMin: Math.min(...rs),
    rMax: Math.max(...rs),
    worldMinX: Math.min(...worlds.map((point) => point.x)) - layout.hexSize,
    worldMaxX: Math.max(...worlds.map((point) => point.x)) + layout.hexSize,
    worldMinZ: Math.min(...worlds.map((point) => point.z)) - layout.hexSize,
    worldMaxZ: Math.max(...worlds.map((point) => point.z)) + layout.hexSize
  };
}
