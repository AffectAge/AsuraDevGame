import { Mesh, VertexData } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import {
  BLEND_FACTOR,
  ELEVATION_STEP,
  HEX_CORNERS,
  SOLID_FACTOR,
  TERRACE_STEPS,
  offsetToWorld,
  terraceLerp,
  type EdgeType,
  type HexCell,
  type HexDirection,
  type HexGridArtifact,
  type Vec3
} from "../../../../shared/src";
import type { MapLookup } from "../data/MapLookup";
import { lerpColor, toRgba, type Rgba } from "./colors";

type MeshBuffers = {
  positions: number[];
  indices: number[];
  colors: number[];
};

const EDGE_DIRECTIONS: readonly HexDirection[] = [5, 0, 1, 2, 3, 4];

export function createTerrainMesh(scene: Scene, artifact: HexGridArtifact, lookup: MapLookup): Mesh {
  const buffers: MeshBuffers = { positions: [], indices: [], colors: [] };

  for (const cell of artifact.cells) {
    triangulateCell(artifact, lookup, cell, buffers);
  }

  const mesh = new Mesh("hex-terrain", scene);
  const vertexData = new VertexData();
  const normals: number[] = [];
  VertexData.ComputeNormals(buffers.positions, buffers.indices, normals);
  vertexData.positions = buffers.positions;
  vertexData.indices = buffers.indices;
  vertexData.colors = buffers.colors;
  vertexData.normals = normals;
  vertexData.applyToMesh(mesh);
  return mesh;
}

function triangulateCell(artifact: HexGridArtifact, lookup: MapLookup, cell: HexCell, buffers: MeshBuffers): void {
  const center = cellCenter(cell);
  const centerColor = toRgba(cell.color);

  for (let edgeIndex = 0; edgeIndex < 6; edgeIndex += 1) {
    const v1 = add(center, scale(HEX_CORNERS[edgeIndex], SOLID_FACTOR));
    const v2 = add(center, scale(HEX_CORNERS[edgeIndex + 1], SOLID_FACTOR));

    const direction = EDGE_DIRECTIONS[edgeIndex];
    const neighbor = lookup.getById(artifact.edgesByCellId[cell.id]?.[direction]?.neighborId);
    if (!neighbor) {
      triangulateBoundaryWedge(cell, edgeIndex, center, buffers);
    } else {
      addTriangle(buffers, center, v1, v2, centerColor, centerColor, centerColor);
    }

    if (neighbor && edgeIndex <= 2) {
      triangulateConnection(artifact, lookup, cell, neighbor, edgeIndex, v1, v2, buffers);
    }
  }
}

function triangulateConnection(
  artifact: HexGridArtifact,
  lookup: MapLookup,
  cell: HexCell,
  neighbor: HexCell,
  edgeIndex: number,
  v1: Vec3,
  v2: Vec3,
  buffers: MeshBuffers
): void {
  const bridge = getBridge(edgeIndex);
  const v3 = withY(add(v1, bridge), neighbor.elevation * ELEVATION_STEP);
  const v4 = withY(add(v2, bridge), neighbor.elevation * ELEVATION_STEP);
  const cellColor = toRgba(cell.color);
  const neighborColor = toRgba(neighbor.color);

  if (edgeTypeBetween(cell, neighbor) === "slope") {
    triangulateEdgeTerraces(v1, v2, cellColor, v3, v4, neighborColor, buffers);
  } else {
    addQuad(buffers, v1, v2, v3, v4, cellColor, cellColor, neighborColor, neighborColor);
  }

  if (edgeIndex > 1) return;
  const nextDirection = EDGE_DIRECTIONS[edgeIndex + 1];
  const nextNeighbor = lookup.getById(artifact.edgesByCellId[cell.id]?.[nextDirection]?.neighborId);
  if (!nextNeighbor) return;
  const v5 = withY(add(v2, getBridge(edgeIndex + 1)), nextNeighbor.elevation * ELEVATION_STEP);
  triangulateCorner(v2, cell, v4, neighbor, v5, nextNeighbor, buffers);
}

function triangulateEdgeTerraces(beginLeft: Vec3, beginRight: Vec3, beginColor: Rgba, endLeft: Vec3, endRight: Vec3, endColor: Rgba, buffers: MeshBuffers): void {
  let previousLeft = beginLeft;
  let previousRight = beginRight;
  let previousColor = beginColor;

  for (let step = 1; step <= TERRACE_STEPS; step += 1) {
    const nextLeft = terraceLerp(beginLeft, endLeft, step);
    const nextRight = terraceLerp(beginRight, endRight, step);
    const nextColor = lerpColor(beginColor, endColor, step / TERRACE_STEPS);
    addQuad(buffers, previousLeft, previousRight, nextLeft, nextRight, previousColor, previousColor, nextColor, nextColor);
    previousLeft = nextLeft;
    previousRight = nextRight;
    previousColor = nextColor;
  }
}

function triangulateCorner(v1: Vec3, cell1: HexCell, v2: Vec3, cell2: HexCell, v3: Vec3, cell3: HexCell, buffers: MeshBuffers): void {
  if (cell1.elevation <= cell2.elevation) {
    if (cell1.elevation <= cell3.elevation) {
      triangulateOrderedCorner(v1, cell1, v2, cell2, v3, cell3, buffers);
    } else {
      triangulateOrderedCorner(v3, cell3, v1, cell1, v2, cell2, buffers);
    }
  } else if (cell2.elevation <= cell3.elevation) {
    triangulateOrderedCorner(v2, cell2, v3, cell3, v1, cell1, buffers);
  } else {
    triangulateOrderedCorner(v3, cell3, v1, cell1, v2, cell2, buffers);
  }
}

function triangulateOrderedCorner(bottom: Vec3, bottomCell: HexCell, left: Vec3, leftCell: HexCell, right: Vec3, rightCell: HexCell, buffers: MeshBuffers): void {
  const leftEdgeType = edgeTypeBetween(bottomCell, leftCell);
  const rightEdgeType = edgeTypeBetween(bottomCell, rightCell);

  if (leftEdgeType === "slope") {
    if (rightEdgeType === "slope") {
      triangulateCornerTerraces(bottom, bottomCell, left, leftCell, right, rightCell, buffers);
      return;
    }
    if (rightEdgeType === "flat") {
      triangulateCornerTerraces(left, leftCell, right, rightCell, bottom, bottomCell, buffers);
      return;
    }
    triangulateCornerTerracesCliff(bottom, bottomCell, left, leftCell, right, rightCell, buffers);
    return;
  }

  if (rightEdgeType === "slope") {
    if (leftEdgeType === "flat") {
      triangulateCornerTerraces(right, rightCell, bottom, bottomCell, left, leftCell, buffers);
      return;
    }
    triangulateCornerCliffTerraces(bottom, bottomCell, left, leftCell, right, rightCell, buffers);
    return;
  }

  if (edgeTypeBetween(leftCell, rightCell) === "slope") {
    if (leftCell.elevation < rightCell.elevation) {
      triangulateCornerCliffTerraces(right, rightCell, bottom, bottomCell, left, leftCell, buffers);
    } else {
      triangulateCornerTerracesCliff(left, leftCell, right, rightCell, bottom, bottomCell, buffers);
    }
    return;
  }

  addTriangle(buffers, bottom, left, right, toRgba(bottomCell.color), toRgba(leftCell.color), toRgba(rightCell.color));
}

function triangulateCornerTerraces(begin: Vec3, beginCell: HexCell, left: Vec3, leftCell: HexCell, right: Vec3, rightCell: HexCell, buffers: MeshBuffers): void {
  let v3 = terraceLerp(begin, left, 1);
  let v4 = terraceLerp(begin, right, 1);
  let c3 = lerpColor(toRgba(beginCell.color), toRgba(leftCell.color), 1 / TERRACE_STEPS);
  let c4 = lerpColor(toRgba(beginCell.color), toRgba(rightCell.color), 1 / TERRACE_STEPS);
  addTriangle(buffers, begin, v3, v4, toRgba(beginCell.color), c3, c4);

  for (let step = 2; step < TERRACE_STEPS; step += 1) {
    const v1 = v3;
    const v2 = v4;
    const c1 = c3;
    const c2 = c4;
    v3 = terraceLerp(begin, left, step);
    v4 = terraceLerp(begin, right, step);
    c3 = lerpColor(toRgba(beginCell.color), toRgba(leftCell.color), step / TERRACE_STEPS);
    c4 = lerpColor(toRgba(beginCell.color), toRgba(rightCell.color), step / TERRACE_STEPS);
    addQuad(buffers, v1, v2, v3, v4, c1, c2, c3, c4);
  }

  addQuad(buffers, v3, v4, left, right, c3, c4, toRgba(leftCell.color), toRgba(rightCell.color));
}

function triangulateCornerTerracesCliff(begin: Vec3, beginCell: HexCell, left: Vec3, leftCell: HexCell, right: Vec3, rightCell: HexCell, buffers: MeshBuffers): void {
  const boundaryT = Math.abs(1 / (rightCell.elevation - beginCell.elevation));
  const boundary = lerpVec3(begin, right, boundaryT);
  const boundaryColor = lerpColor(toRgba(beginCell.color), toRgba(rightCell.color), boundaryT);
  triangulateBoundaryTriangle(begin, beginCell, left, leftCell, boundary, boundaryColor, buffers);

  if (edgeTypeBetween(leftCell, rightCell) === "slope") {
    triangulateBoundaryTriangle(left, leftCell, right, rightCell, boundary, boundaryColor, buffers);
  } else {
    addTriangle(buffers, left, right, boundary, toRgba(leftCell.color), toRgba(rightCell.color), boundaryColor);
  }
}

function triangulateCornerCliffTerraces(begin: Vec3, beginCell: HexCell, left: Vec3, leftCell: HexCell, right: Vec3, rightCell: HexCell, buffers: MeshBuffers): void {
  const boundaryT = Math.abs(1 / (leftCell.elevation - beginCell.elevation));
  const boundary = lerpVec3(begin, left, boundaryT);
  const boundaryColor = lerpColor(toRgba(beginCell.color), toRgba(leftCell.color), boundaryT);
  triangulateBoundaryTriangle(right, rightCell, begin, beginCell, boundary, boundaryColor, buffers);

  if (edgeTypeBetween(leftCell, rightCell) === "slope") {
    triangulateBoundaryTriangle(left, leftCell, right, rightCell, boundary, boundaryColor, buffers);
  } else {
    addTriangle(buffers, left, right, boundary, toRgba(leftCell.color), toRgba(rightCell.color), boundaryColor);
  }
}

function triangulateBoundaryTriangle(begin: Vec3, beginCell: HexCell, left: Vec3, leftCell: HexCell, boundary: Vec3, boundaryColor: Rgba, buffers: MeshBuffers): void {
  let v2 = terraceLerp(begin, left, 1);
  let c2 = lerpColor(toRgba(beginCell.color), toRgba(leftCell.color), 1 / TERRACE_STEPS);
  addTriangle(buffers, begin, v2, boundary, toRgba(beginCell.color), c2, boundaryColor);

  for (let step = 2; step < TERRACE_STEPS; step += 1) {
    const v1 = v2;
    const c1 = c2;
    v2 = terraceLerp(begin, left, step);
    c2 = lerpColor(toRgba(beginCell.color), toRgba(leftCell.color), step / TERRACE_STEPS);
    addTriangle(buffers, v1, v2, boundary, c1, c2, boundaryColor);
  }

  addTriangle(buffers, v2, left, boundary, c2, toRgba(leftCell.color), boundaryColor);
}

function triangulateBoundaryWedge(cell: HexCell, edgeIndex: number, center: Vec3, buffers: MeshBuffers): void {
  const color = toRgba(cell.color);
  addTriangle(buffers, center, add(center, HEX_CORNERS[edgeIndex]), add(center, HEX_CORNERS[edgeIndex + 1]), color, color, color);
}

function cellCenter(cell: HexCell): Vec3 {
  return offsetToWorld(cell.offset.x, cell.offset.z, cell.elevation * ELEVATION_STEP);
}

function getBridge(edgeIndex: number): Vec3 {
  return scale(add(HEX_CORNERS[edgeIndex], HEX_CORNERS[edgeIndex + 1]), BLEND_FACTOR);
}

function edgeTypeBetween(a: HexCell, b: HexCell): EdgeType {
  const delta = Math.abs(a.elevation - b.elevation);
  if (delta === 0) return "flat";
  if (delta === 1) return "slope";
  return "cliff";
}

function addTriangle(buffers: MeshBuffers, v1: Vec3, v2: Vec3, v3: Vec3, c1: Rgba, c2: Rgba, c3: Rgba): void {
  const baseIndex = buffers.positions.length / 3;
  pushVertex(buffers, v1, c1);
  pushVertex(buffers, v2, c2);
  pushVertex(buffers, v3, c3);
  buffers.indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
}

function addQuad(buffers: MeshBuffers, v1: Vec3, v2: Vec3, v3: Vec3, v4: Vec3, c1: Rgba, c2: Rgba, c3: Rgba, c4: Rgba): void {
  const baseIndex = buffers.positions.length / 3;
  pushVertex(buffers, v1, c1);
  pushVertex(buffers, v2, c2);
  pushVertex(buffers, v3, c3);
  pushVertex(buffers, v4, c4);
  buffers.indices.push(baseIndex, baseIndex + 2, baseIndex + 1, baseIndex + 1, baseIndex + 2, baseIndex + 3);
}

function pushVertex(buffers: MeshBuffers, vertex: Vec3, color: Rgba): void {
  buffers.positions.push(vertex.x, vertex.y, vertex.z);
  buffers.colors.push(color.r, color.g, color.b, color.a);
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(value: Vec3, amount: number): Vec3 {
  return { x: value.x * amount, y: value.y * amount, z: value.z * amount };
}

function withY(value: Vec3, y: number): Vec3 {
  return { x: value.x, y, z: value.z };
}
