import { Mesh, VertexData } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact, MapRegion, MapTile } from "../../../../shared/src/map";
import { hexCorner, hexToWorld } from "../../../../shared/src/map";
import { createRegionOverlayMaterial } from "../shaders";

const regionColors = [
  { r: 0.95, g: 0.85, b: 0.42 },
  { r: 0.4, g: 0.86, b: 0.58 },
  { r: 0.32, g: 0.58, b: 0.92 },
  { r: 0.8, g: 0.52, b: 0.92 },
  { r: 0.92, g: 0.58, b: 0.4 }
] as const;

export function createRegionOverlayLayer(scene: Scene, artifact: GeneratedMapArtifact): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const tilesById = new Map(artifact.tiles.map((tile) => [tile.id, tile]));
  const primaryRegionByTile = new Map<string, MapRegion>();

  for (const region of artifact.regions) {
    if (region.visual.borderStyle === "none") continue;
    for (const tileId of region.tileIds) {
      if (!primaryRegionByTile.has(tileId)) {
        primaryRegionByTile.set(tileId, region);
      }
    }
  }

  for (const [tileId, region] of primaryRegionByTile) {
    const tile = tilesById.get(tileId);
    if (!tile) continue;
    appendRegionHex(artifact, tile, region, positions, indices, colors);
  }

  const mesh = new Mesh("region-overlay-layer", scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.colors = colors;
  vertexData.applyToMesh(mesh);

  mesh.material = createRegionOverlayMaterial(scene);
  mesh.freezeWorldMatrix();
  return mesh;
}

function appendRegionHex(
  artifact: GeneratedMapArtifact,
  tile: MapTile,
  region: MapRegion,
  positions: number[],
  indices: number[],
  colors: number[]
): void {
  const center = hexToWorld(tile.q, tile.r, artifact.layout);
  const y = Math.max(tile.elevation * artifact.renderHints.heightScale, artifact.renderHints.waterLevel) + 0.035;
  const color = regionColors[region.visual.colorIndex % regionColors.length];
  const alpha = region.type === "ocean" || region.type === "lake" ? 0.08 : 0.16;
  const baseIndex = positions.length / 3;

  positions.push(center.x, y, center.z);
  colors.push(color.r, color.g, color.b, alpha);

  for (let corner = 0; corner < 6; corner += 1) {
    const point = hexCorner(tile.q, tile.r, corner, artifact.layout);
    positions.push(point.x, y, point.z);
    colors.push(color.r, color.g, color.b, alpha);
  }

  for (let corner = 1; corner <= 6; corner += 1) {
    indices.push(baseIndex, baseIndex + corner, baseIndex + (corner % 6) + 1);
  }
}
