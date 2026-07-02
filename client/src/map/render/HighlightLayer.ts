import { Color3, Mesh, MeshBuilder } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact, MapTile } from "../../../../shared/src/map";
import { hexToWorld } from "../../../../shared/src/map";
import { createHighlightMaterial } from "../shaders";

export class HighlightLayer {
  private readonly hoverMesh: Mesh;
  private readonly selectedMesh: Mesh;

  constructor(private readonly scene: Scene, private readonly artifact: GeneratedMapArtifact) {
    this.hoverMesh = this.createHexMesh("hover-highlight", new Color3(1, 1, 1), 0.25);
    this.selectedMesh = this.createHexMesh("selected-highlight", new Color3(1, 0.86, 0.28), 0.34);
  }

  setHover(tile: MapTile | null): void {
    this.place(this.hoverMesh, tile);
  }

  setSelected(tile: MapTile | null): void {
    this.place(this.selectedMesh, tile);
  }

  private createHexMesh(name: string, color: Color3, alpha: number): Mesh {
    const mesh = MeshBuilder.CreateDisc(name, { radius: this.artifact.layout.hexSize * 0.96, tessellation: 6 }, this.scene);
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.z = Math.PI / 6;
    mesh.material = createHighlightMaterial(this.scene, name, color, alpha);
    mesh.setEnabled(false);
    return mesh;
  }

  private place(mesh: Mesh, tile: MapTile | null): void {
    if (!tile) {
      mesh.setEnabled(false);
      return;
    }
    const center = hexToWorld(tile.q, tile.r, this.artifact.layout);
    mesh.position.set(center.x, tile.elevation * this.artifact.renderHints.heightScale + 0.05, center.z);
    mesh.setEnabled(true);
  }
}
