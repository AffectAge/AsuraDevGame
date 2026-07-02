import { Mesh, VertexData } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import { hexCorner, type GeneratedMapArtifact, type HexDirection } from "../../../../shared/src/map";
import { createRiverMaterial } from "../shaders";

export function createRiverMeshLayer(scene: Scene, artifact: GeneratedMapArtifact): Mesh | null {
  if (artifact.rivers.length === 0) return null;
  const tilesById = new Map(artifact.tiles.map((tile) => [tile.id, tile]));
  const positions: number[] = [];
  const indices: number[] = [];
  const y = artifact.renderHints.waterLevel + 0.06;

  for (const river of artifact.rivers) {
    const from = cornerPosition(river.fromCorner, artifact, tilesById);
    const to = cornerPosition(river.toCorner, artifact, tilesById);
    if (!from || !to) continue;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) continue;
    const halfWidth = river.width * 0.5;
    const nx = (-dz / length) * halfWidth;
    const nz = (dx / length) * halfWidth;
    const baseIndex = positions.length / 3;

    positions.push(from.x + nx, y, from.z + nz);
    positions.push(from.x - nx, y, from.z - nz);
    positions.push(to.x + nx, y, to.z + nz);
    positions.push(to.x - nx, y, to.z - nz);
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 2, baseIndex + 1, baseIndex + 3);
  }

  const mesh = new Mesh("river-layer", scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh);
  mesh.material = createRiverMaterial(scene);
  mesh.freezeWorldMatrix();
  return mesh;
}

function cornerPosition(
  cornerId: string,
  artifact: GeneratedMapArtifact,
  tilesById: Map<string, GeneratedMapArtifact["tiles"][number]>
): { x: number; z: number } | null {
  const match = /^(.*):c([0-5])$/.exec(cornerId);
  if (!match) return null;
  const tile = tilesById.get(match[1]);
  if (!tile) return null;
  return hexCorner(tile.q, tile.r, Number(match[2]) as HexDirection, artifact.layout);
}
