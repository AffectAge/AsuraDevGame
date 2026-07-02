import { Mesh, VertexData } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact } from "../../../../shared/src/map";
import { hexCorner, hexToWorld } from "../../../../shared/src/map";
import { createTerrainMaterial } from "../shaders";
import { tileColor } from "./colors";

export function createTerrainMeshLayer(scene: Scene, artifact: GeneratedMapArtifact): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const heightScale = artifact.renderHints.heightScale;

  for (const tile of artifact.tiles) {
    if (tile.isWater) continue;
    const center = hexToWorld(tile.q, tile.r, artifact.layout);
    const y = tile.elevation * heightScale;
    const color = tileColor(tile, artifact.renderHints.terrainPalette);
    const baseIndex = positions.length / 3;
    positions.push(center.x, y, center.z);
    colors.push(color.r, color.g, color.b, color.a);

    for (let corner = 0; corner < 6; corner += 1) {
      const point = hexCorner(tile.q, tile.r, corner, artifact.layout);
      positions.push(point.x, y, point.z);
      colors.push(color.r, color.g, color.b, color.a);
    }

    for (let corner = 1; corner <= 6; corner += 1) {
      indices.push(baseIndex, baseIndex + corner, baseIndex + (corner % 6) + 1);
    }
  }

  const mesh = new Mesh("terrain-layer", scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.colors = colors;
  vertexData.applyToMesh(mesh);
  mesh.material = createTerrainMaterial(scene);
  mesh.freezeWorldMatrix();
  return mesh;
}
