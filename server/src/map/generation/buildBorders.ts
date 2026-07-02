import type { BorderSegment, GeneratedMapArtifact, HexDirection, TileEdge } from "../../../../shared/src/map";
import { hexCorner } from "../../../../shared/src/map";
import { hashString } from "./rng";

export function buildBorders(edgesByTileId: Record<string, TileEdge[]>, layout: GeneratedMapArtifact["layout"], seed: string): BorderSegment[] {
  const borders: BorderSegment[] = [];
  const emitted = new Set<string>();

  for (const [tileA, edges] of Object.entries(edgesByTileId)) {
    const [q, r] = tileA.split(",").map(Number);
    for (const edge of edges) {
      const visualTypes = edge.edgeTypes.filter((type) => type === "coast" || type === "regionBorder" || type === "mapEdge" || type === "river");
      for (const edgeType of visualTypes) {
        const borderType = edgeType === "regionBorder" ? "region" : edgeType;
        const pair = edge.neighborId ? [tileA, edge.neighborId].sort().join(":") : `${tileA}:null:${edge.dir}`;
        const key = `${pair}:${borderType}`;
        if (emitted.has(key)) continue;
        emitted.add(key);
        const start = hexCorner(q, r, edge.dir, layout);
        const end = hexCorner(q, r, (edge.dir + 1) % 6, layout);
        borders.push({
          id: `border_${borders.length}`,
          type: borderType as BorderSegment["type"],
          tileA,
          tileB: edge.neighborId,
          dirFromA: edge.dir as HexDirection,
          polyline: buildNoisyEdge(start, end, hashString(`${seed}:${key}`), edge.noiseAmplitude, 4),
          noiseSeed: hashString(`${seed}:border:${key}`)
        });
      }
    }
  }

  return borders;
}

function buildNoisyEdge(start: { x: number; z: number }, end: { x: number; z: number }, seed: number, amplitude: number, segments: number): { x: number; z: number }[] {
  const points = [start];
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz) || 1;
  const nx = -dz / length;
  const nz = dx / length;

  for (let i = 1; i < segments; i += 1) {
    const t = i / segments;
    const wave = Math.sin((seed + i * 92821) * 0.001) * amplitude;
    points.push({
      x: start.x + dx * t + nx * wave,
      z: start.z + dz * t + nz * wave
    });
  }
  points.push(end);
  return points;
}
