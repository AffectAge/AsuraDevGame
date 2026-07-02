import type { HexCell, HexGridArtifact } from "../../../../shared/src";

export class MapLookup {
  private readonly cellsById: Map<string, HexCell>;

  constructor(private readonly artifact: HexGridArtifact) {
    this.cellsById = new Map(artifact.cells.map((cell) => [cell.id, cell]));
  }

  getById(id: string | null | undefined): HexCell | null {
    return id ? this.cellsById.get(id) ?? null : null;
  }

  getByOffset(x: number, z: number): HexCell | null {
    if (x < 0 || x >= this.artifact.settings.width || z < 0 || z >= this.artifact.settings.height) return null;
    return this.getById(`${x},${z}`);
  }
}
