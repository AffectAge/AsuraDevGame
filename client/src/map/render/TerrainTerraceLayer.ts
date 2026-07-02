import { Mesh, VertexData } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact, MapTile, TileEdge } from "../../../../shared/src/map";
import { hexCorner, hexToWorld } from "../../../../shared/src/map";
import { createTerrainTerraceMaterial } from "../shaders";
import { tileColor } from "./colors";

const SLOPE_THRESHOLD = 0.08;
const CLIFF_THRESHOLD = 0.35;
const TERRACES_PER_SLOPE = 2;
const TERRACE_STEPS = TERRACES_PER_SLOPE * 2 + 1;
const TERRACE_INSET_FACTOR = 0.2;
const TERRACE_Y_OFFSET = 0.012;

type Point3 = { x: number; y: number; z: number };
type Rgba = { r: number; g: number; b: number; a: number };

export function createTerrainTerraceLayer(scene: Scene, artifact: GeneratedMapArtifact): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const tilesById = new Map(artifact.tiles.map((tile) => [tile.id, tile]));

  for (const tile of artifact.tiles) {
    if (tile.isWater) continue;
    const highY = tile.elevation * artifact.renderHints.heightScale;
    const tileEdges = artifact.topology.edgesByTileId[tile.id] ?? [];

    for (const edge of tileEdges) {
      if (!edge.neighborId) continue;
      const neighbor = tilesById.get(edge.neighborId);
      if (!neighbor || neighbor.isWater) continue;

      const lowY = neighbor.elevation * artifact.renderHints.heightScale;
      const drop = highY - lowY;
      if (drop < SLOPE_THRESHOLD || drop >= CLIFF_THRESHOLD) continue;

      appendTerraceStrip(artifact, tile, neighbor, edge, positions, indices, colors);
    }
  }

  const mesh = new Mesh("terrain-terrace-layer", scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.colors = colors;
  vertexData.applyToMesh(mesh);
  mesh.material = createTerrainTerraceMaterial(scene);
  mesh.freezeWorldMatrix();
  return mesh;
}

function appendTerraceStrip(
  artifact: GeneratedMapArtifact,
  highTile: MapTile,
  lowTile: MapTile,
  edge: TileEdge,
  positions: number[],
  indices: number[],
  colors: number[]
): void {
  const highY = highTile.elevation * artifact.renderHints.heightScale + TERRACE_Y_OFFSET;
  const lowY = lowTile.elevation * artifact.renderHints.heightScale + TERRACE_Y_OFFSET;
  const edgeStart = hexCorner(highTile.q, highTile.r, edge.dir, artifact.layout);
  const edgeEnd = hexCorner(highTile.q, highTile.r, (edge.dir + 1) % 6, artifact.layout);
  const lowCenter = hexToWorld(lowTile.q, lowTile.r, artifact.layout);
  const beginLeft: Point3 = { x: edgeStart.x, y: highY, z: edgeStart.z };
  const beginRight: Point3 = { x: edgeEnd.x, y: highY, z: edgeEnd.z };
  const endLeft: Point3 = insetToward({ x: edgeStart.x, y: lowY, z: edgeStart.z }, lowCenter);
  const endRight: Point3 = insetToward({ x: edgeEnd.x, y: lowY, z: edgeEnd.z }, lowCenter);
  const highColor = tileColor(highTile, artifact.renderHints.terrainPalette);
  const lowColor = tileColor(lowTile, artifact.renderHints.terrainPalette);

  let previousLeft = beginLeft;
  let previousRight = beginRight;
  let previousColor = highColor;

  for (let step = 1; step <= TERRACE_STEPS; step += 1) {
    const nextLeft = terraceLerp(beginLeft, endLeft, step);
    const nextRight = terraceLerp(beginRight, endRight, step);
    const nextColor = colorLerp(highColor, lowColor, step / TERRACE_STEPS);
    appendQuad(previousLeft, previousRight, nextLeft, nextRight, previousColor, nextColor, positions, indices, colors);
    previousLeft = nextLeft;
    previousRight = nextRight;
    previousColor = nextColor;
  }
}

function insetToward(point: Point3, target: { x: number; z: number }): Point3 {
  return {
    x: point.x + (target.x - point.x) * TERRACE_INSET_FACTOR,
    y: point.y,
    z: point.z + (target.z - point.z) * TERRACE_INSET_FACTOR
  };
}

function terraceLerp(a: Point3, b: Point3, step: number): Point3 {
  const horizontalT = step / TERRACE_STEPS;
  const verticalT = Math.floor((step + 1) / 2) / (TERRACES_PER_SLOPE + 1);
  return {
    x: a.x + (b.x - a.x) * horizontalT,
    y: a.y + (b.y - a.y) * verticalT,
    z: a.z + (b.z - a.z) * horizontalT
  };
}

function colorLerp(a: Rgba, b: Rgba, t: number): Rgba {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t
  };
}

function appendQuad(
  leftA: Point3,
  rightA: Point3,
  leftB: Point3,
  rightB: Point3,
  colorA: Rgba,
  colorB: Rgba,
  positions: number[],
  indices: number[],
  colors: number[]
): void {
  const baseIndex = positions.length / 3;
  positions.push(leftA.x, leftA.y, leftA.z, rightA.x, rightA.y, rightA.z, leftB.x, leftB.y, leftB.z, rightB.x, rightB.y, rightB.z);
  indices.push(baseIndex, baseIndex + 2, baseIndex + 1, baseIndex + 1, baseIndex + 2, baseIndex + 3);
  pushColor(colors, colorA);
  pushColor(colors, colorA);
  pushColor(colors, colorB);
  pushColor(colors, colorB);
}

function pushColor(colors: number[], color: Rgba): void {
  colors.push(color.r, color.g, color.b, color.a);
}
