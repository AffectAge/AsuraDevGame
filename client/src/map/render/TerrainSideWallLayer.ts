import { Mesh, VertexData } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact, MapTile, TileEdge } from "../../../../shared/src/map";
import { hexCorner } from "../../../../shared/src/map";
import { createTerrainSideWallMaterial } from "../shaders";
import { tileColor } from "./colors";

const WALL_THRESHOLD = 0.08;
const LAND_CLIFF_THRESHOLD = 0.35;
const WATER_BOTTOM_OFFSET = 0.04;
const WALL_SHADE = 0.58;

export function createTerrainSideWallLayer(scene: Scene, artifact: GeneratedMapArtifact): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const tilesById = new Map(artifact.tiles.map((tile) => [tile.id, tile]));

  for (const tile of artifact.tiles) {
    if (tile.isWater) continue;
    const topY = tile.elevation * artifact.renderHints.heightScale;
    const tileEdges = artifact.topology.edgesByTileId[tile.id] ?? [];

    for (const edge of tileEdges) {
      const bottomY = wallBottomY(tile, edge, tilesById, artifact);
      if (bottomY === null || topY - bottomY < WALL_THRESHOLD) continue;
      appendWallQuad(artifact, tile, edge, topY, bottomY, positions, indices, colors);
    }
  }

  const mesh = new Mesh("terrain-side-wall-layer", scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.colors = colors;
  vertexData.applyToMesh(mesh);
  mesh.material = createTerrainSideWallMaterial(scene);
  mesh.freezeWorldMatrix();
  return mesh;
}

function wallBottomY(tile: MapTile, edge: TileEdge, tilesById: Map<string, MapTile>, artifact: GeneratedMapArtifact): number | null {
  if (!edge.neighborId) return artifact.renderHints.waterLevel - WATER_BOTTOM_OFFSET;
  const neighbor = tilesById.get(edge.neighborId);
  if (!neighbor || neighbor.isWater) return artifact.renderHints.waterLevel - WATER_BOTTOM_OFFSET;
  const neighborY = neighbor.elevation * artifact.renderHints.heightScale;
  const tileY = tile.elevation * artifact.renderHints.heightScale;
  return tileY - neighborY >= LAND_CLIFF_THRESHOLD ? neighborY : null;
}

function appendWallQuad(
  artifact: GeneratedMapArtifact,
  tile: MapTile,
  edge: TileEdge,
  topY: number,
  bottomY: number,
  positions: number[],
  indices: number[],
  colors: number[]
): void {
  const start = hexCorner(tile.q, tile.r, edge.dir, artifact.layout);
  const end = hexCorner(tile.q, tile.r, (edge.dir + 1) % 6, artifact.layout);
  const baseIndex = positions.length / 3;
  const color = tileColor(tile, artifact.renderHints.terrainPalette);
  const shaded = {
    r: color.r * WALL_SHADE,
    g: color.g * WALL_SHADE,
    b: color.b * WALL_SHADE,
    a: 1
  };

  positions.push(start.x, topY, start.z, end.x, topY, end.z, start.x, bottomY, start.z, end.x, bottomY, end.z);
  indices.push(baseIndex, baseIndex + 2, baseIndex + 1, baseIndex + 1, baseIndex + 2, baseIndex + 3);

  for (let i = 0; i < 4; i += 1) {
    colors.push(shaded.r, shaded.g, shaded.b, shaded.a);
  }
}
