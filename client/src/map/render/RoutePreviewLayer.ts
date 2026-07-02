import { Mesh, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact, TileId } from "../../../../shared/src/map";
import { hexToWorld } from "../../../../shared/src/map";
import { createRoutePreviewMaterial } from "../shaders";

export class RoutePreviewLayer {
  private readonly material: StandardMaterial;
  private readonly meshes: Mesh[] = [];
  private readonly tilesById: Map<TileId, GeneratedMapArtifact["tiles"][number]>;

  constructor(private readonly scene: Scene, private readonly artifact: GeneratedMapArtifact) {
    this.tilesById = new Map(artifact.tiles.map((tile) => [tile.id, tile]));
    this.material = createRoutePreviewMaterial(scene);
  }

  setRoute(tileIds: TileId[]): void {
    this.clear();
    for (const id of tileIds) {
      const tile = this.tilesById.get(id);
      if (!tile) continue;
      const mesh = MeshBuilder.CreateDisc(
        `route-preview-${id}`,
        {
          radius: this.artifact.layout.hexSize * 0.42,
          tessellation: 6
        },
        this.scene
      );
      const center = hexToWorld(tile.q, tile.r, this.artifact.layout);
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.z = Math.PI / 6;
      mesh.position.set(center.x, tile.elevation * this.artifact.renderHints.heightScale + 0.075, center.z);
      mesh.material = this.material;
      this.meshes.push(mesh);
    }
  }

  clear(): void {
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes.length = 0;
  }
}
