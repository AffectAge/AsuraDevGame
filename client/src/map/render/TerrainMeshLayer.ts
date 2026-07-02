import { Mesh, VertexData } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact, HexDirection, MapTile } from "../../../../shared/src/map";
import { hexCorner, hexToWorld } from "../../../../shared/src/map";
import { createTerrainMaterial } from "../shaders";
import { tileColor } from "./colors";

type Rgba = { r: number; g: number; b: number; a: number };

export function createTerrainMeshLayer(scene: Scene, artifact: GeneratedMapArtifact): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const barycentric: number[] = [];
  const blendColorA: number[] = [];
  const blendColorB: number[] = [];
  const blendColorC: number[] = [];
  const blendCenter: number[] = [];
  const blendNoise: number[] = [];
  const heightScale = artifact.renderHints.heightScale;
  const tilesById = new Map(artifact.tiles.map((tile) => [tile.id, tile]));

  for (const tile of artifact.tiles) {
    if (tile.isWater) continue;
    const center = hexToWorld(tile.q, tile.r, artifact.layout);
    const y = tile.elevation * heightScale;
    const centerColor = tileColor(tile, artifact.renderHints.terrainPalette);

    for (let corner = 0; corner < 6; corner += 1) {
      const cornerA = hexCorner(tile.q, tile.r, corner, artifact.layout);
      const cornerB = hexCorner(tile.q, tile.r, (corner + 1) % 6, artifact.layout);
      const cornerAColor = cornerBlendColor(artifact, tilesById, tile, corner as HexDirection);
      const cornerBColor = cornerBlendColor(artifact, tilesById, tile, ((corner + 1) % 6) as HexDirection);
      const baseIndex = positions.length / 3;
      const noise = tileNoise(tile);

      positions.push(center.x, y, center.z, cornerA.x, y, cornerA.z, cornerB.x, y, cornerB.z);
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
      barycentric.push(1, 0, 0, 0, 1, 0, 0, 0, 1);

      pushRepeatedColor(blendColorA, centerColor);
      pushRepeatedColor(blendColorB, cornerAColor);
      pushRepeatedColor(blendColorC, cornerBColor);
      pushRepeatedColor(blendCenter, centerColor);
      blendNoise.push(noise, noise, noise);
    }
  }

  const mesh = new Mesh("terrain-layer", scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.applyToMesh(mesh);
  mesh.setVerticesData("a_barycentric", barycentric, false, 3);
  mesh.setVerticesData("blendColorA", blendColorA, false, 4);
  mesh.setVerticesData("blendColorB", blendColorB, false, 4);
  mesh.setVerticesData("blendColorC", blendColorC, false, 4);
  mesh.setVerticesData("blendCenter", blendCenter, false, 4);
  mesh.setVerticesData("blendNoise", blendNoise, false, 1);
  mesh.material = createTerrainMaterial(scene);
  mesh.freezeWorldMatrix();
  return mesh;
}

function cornerBlendColor(artifact: GeneratedMapArtifact, tilesById: Map<string, MapTile>, tile: MapTile, corner: HexDirection): Rgba {
  const edgeA = edgeNeighbor(artifact, tilesById, tile, previousDirection(corner));
  const edgeB = edgeNeighbor(artifact, tilesById, tile, corner);
  const colors = [tile, edgeA, edgeB].filter((candidate): candidate is MapTile => candidate !== null && !candidate.isWater).map((candidate) => tileColor(candidate, artifact.renderHints.terrainPalette));
  return averageColor(colors.length > 0 ? colors : [tileColor(tile, artifact.renderHints.terrainPalette)]);
}

function edgeNeighbor(artifact: GeneratedMapArtifact, tilesById: Map<string, MapTile>, tile: MapTile, dir: HexDirection): MapTile | null {
  const neighborId = artifact.topology.edgesByTileId[tile.id]?.find((edge) => edge.dir === dir)?.neighborId;
  return neighborId ? tilesById.get(neighborId) ?? null : null;
}

function averageColor(colors: Rgba[]): Rgba {
  const total = colors.reduce(
    (sum, color) => ({
      r: sum.r + color.r,
      g: sum.g + color.g,
      b: sum.b + color.b,
      a: sum.a + color.a
    }),
    { r: 0, g: 0, b: 0, a: 0 }
  );
  const scale = 1 / colors.length;
  return { r: total.r * scale, g: total.g * scale, b: total.b * scale, a: total.a * scale };
}

function pushRepeatedColor(target: number[], color: Rgba): void {
  for (let i = 0; i < 3; i += 1) {
    target.push(color.r, color.g, color.b, color.a);
  }
}

function tileNoise(tile: MapTile): number {
  return (((tile.q * 73856093) ^ (tile.r * 19349663)) >>> 0) / 4294967295;
}

function previousDirection(dir: HexDirection): HexDirection {
  return ((dir + 5) % 6) as HexDirection;
}
