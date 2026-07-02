import { Mesh, VertexData } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact } from "../../../../shared/src/map";
import { hexCorner, hexToWorld } from "../../../../shared/src/map";
import { createWaterMaterial } from "../shaders";

export function createWaterMeshLayer(scene: Scene, artifact: GeneratedMapArtifact): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const y = artifact.renderHints.waterLevel;

  for (const tile of artifact.tiles) {
    if (!tile.isWater) continue;
    const center = hexToWorld(tile.q, tile.r, artifact.layout);
    const baseIndex = positions.length / 3;
    const alpha = tile.baseTerrain === "coast" ? 0.82 : 0.92;
    positions.push(center.x, y, center.z);
    colors.push(0.16, 0.42, 0.62, alpha);

    for (let corner = 0; corner < 6; corner += 1) {
      const point = hexCorner(tile.q, tile.r, corner, artifact.layout);
      positions.push(point.x, y, point.z);
      colors.push(0.16, 0.42, 0.62, alpha);
    }

    for (let corner = 1; corner <= 6; corner += 1) {
      indices.push(baseIndex, baseIndex + corner, baseIndex + (corner % 6) + 1);
    }
  }

  const mesh = new Mesh("water-layer", scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.colors = colors;
  vertexData.applyToMesh(mesh);
  mesh.material = createWaterMaterial(scene);
  mesh.freezeWorldMatrix();
  return mesh;
}
