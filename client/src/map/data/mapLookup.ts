import type { GeneratedMapArtifact, MapTile } from "../../../../shared/src/map";
import { tileId } from "../../../../shared/src/map";

export class MapLookup {
  private readonly tiles = new Map<string, MapTile>();

  constructor(artifact: GeneratedMapArtifact) {
    for (const tile of artifact.tiles) {
      this.tiles.set(tile.id, tile);
    }
  }

  getTile(q: number, r: number): MapTile | null {
    return this.tiles.get(tileId(q, r)) ?? null;
  }
}
