import type { GeneratedMapArtifact } from "../../../../shared/src/map";
import { tileId } from "../../../../shared/src/map";
import { computeDeterministicHash } from "./hashArtifact";

export function validateArtifact(artifact: GeneratedMapArtifact): void {
  if (artifact.schemaVersion !== "map-artifact.v1") {
    throw new Error(`Invalid map schemaVersion: ${artifact.schemaVersion}`);
  }

  if (artifact.settings.orientation !== "flatTop" || artifact.layout.orientation !== "flatTop") {
    throw new Error("Only flatTop map artifacts are supported");
  }

  const expectedTileCount = artifact.settings.width * artifact.settings.height;
  if (artifact.settings.shape === "rectangle" && artifact.tiles.length !== expectedTileCount) {
    throw new Error(`Rectangle map tile count mismatch: expected ${expectedTileCount}, got ${artifact.tiles.length}`);
  }

  const tileIds = new Set<string>();
  for (const tile of artifact.tiles) {
    if (tile.id !== tileId(tile.q, tile.r)) {
      throw new Error(`Tile id mismatch for ${tile.id}`);
    }
    if (tileIds.has(tile.id)) {
      throw new Error(`Duplicate tile id: ${tile.id}`);
    }
    tileIds.add(tile.id);
    assertNormalized(tile.elevation, `${tile.id}.elevation`);
    assertNormalized(tile.moisture, `${tile.id}.moisture`);
    assertNormalized(tile.temperature, `${tile.id}.temperature`);
    if (tile.isWater && tile.passable) {
      throw new Error(`Water tile must not be passable: ${tile.id}`);
    }
  }

  for (const tile of artifact.tiles) {
    const neighbors = artifact.topology.neighborsByTileId[tile.id];
    const edges = artifact.topology.edgesByTileId[tile.id];
    if (!neighbors) throw new Error(`Missing neighbors for tile: ${tile.id}`);
    if (!edges) throw new Error(`Missing edges for tile: ${tile.id}`);
    if (edges.length !== 6) throw new Error(`Tile must have 6 edges: ${tile.id}`);

    for (const neighborId of neighbors) {
      if (!tileIds.has(neighborId)) {
        throw new Error(`Unknown neighbor ${neighborId} on tile ${tile.id}`);
      }
    }

    for (const edge of edges) {
      if (edge.neighborId !== null && !tileIds.has(edge.neighborId)) {
        throw new Error(`Unknown edge neighbor ${edge.neighborId} on tile ${tile.id}`);
      }
      if (edge.edgeTypes.length === 0) {
        throw new Error(`Edge without edgeTypes on tile ${tile.id}, dir ${edge.dir}`);
      }
      if (!edge.edgeTypes.includes(edge.primaryEdgeType)) {
        throw new Error(`primaryEdgeType must be included in edgeTypes on tile ${tile.id}, dir ${edge.dir}`);
      }
    }
  }

  const regionIds = new Set(artifact.regions.map((region) => region.id));
  for (const region of artifact.regions) {
    for (const id of region.tileIds) {
      if (!tileIds.has(id)) throw new Error(`Region ${region.id} references unknown tile ${id}`);
    }
  }
  for (const tile of artifact.tiles) {
    for (const regionId of tile.regionIds) {
      if (!regionIds.has(regionId)) throw new Error(`Tile ${tile.id} references unknown region ${regionId}`);
    }
  }

  for (const border of artifact.borders) {
    if (!tileIds.has(border.tileA)) throw new Error(`Border ${border.id} references unknown tileA ${border.tileA}`);
    if (border.tileB !== null && !tileIds.has(border.tileB)) throw new Error(`Border ${border.id} references unknown tileB ${border.tileB}`);
    if (border.polyline.length < 2) throw new Error(`Border ${border.id} must have at least two points`);
  }

  const riverIds = new Set(artifact.rivers.map((river) => river.id));
  for (const river of artifact.rivers) {
    if (!tileIds.has(river.leftTileId)) throw new Error(`River ${river.id} references unknown leftTileId ${river.leftTileId}`);
    if (!tileIds.has(river.rightTileId)) throw new Error(`River ${river.id} references unknown rightTileId ${river.rightTileId}`);
    assertCornerId(river.fromCorner, river.id, tileIds);
    assertCornerId(river.toCorner, river.id, tileIds);
    if (river.flow <= 0 || river.width <= 0 || river.strahler < 1) {
      throw new Error(`River ${river.id} must have positive flow, width, and strahler`);
    }
  }

  for (const [tileId, edges] of Object.entries(artifact.topology.edgesByTileId)) {
    for (const edge of edges) {
      if (edge.riverId && !riverIds.has(edge.riverId)) {
        throw new Error(`Edge ${tileId}:${edge.dir} references unknown river ${edge.riverId}`);
      }
      if (edge.riverId && !edge.edgeTypes.includes("river")) {
        throw new Error(`Edge ${tileId}:${edge.dir} has riverId without river edgeType`);
      }
    }
  }

  if (!/^[a-f0-9]{64}$/.test(artifact.deterministicHash)) {
    throw new Error("Artifact deterministicHash must be a SHA-256 hex string");
  }

  const expectedHash = computeDeterministicHash(artifact);
  if (artifact.deterministicHash !== expectedHash) {
    throw new Error("Artifact deterministicHash does not match deterministic content");
  }
}

function assertNormalized(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be normalized 0..1`);
  }
}

function assertCornerId(cornerId: string, riverId: string, tileIds: Set<string>): void {
  const match = /^(.*):c[0-5]$/.exec(cornerId);
  if (!match || !tileIds.has(match[1])) {
    throw new Error(`River ${riverId} references invalid corner ${cornerId}`);
  }
}
