import { INNER_RADIUS, OUTER_RADIUS } from "./metrics";

export type OffsetCoordinates = {
  x: number;
  z: number;
};

export type HexCoordinates = {
  x: number;
  y: number;
  z: number;
};

export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

export const HEX_DIRECTIONS: readonly HexCoordinates[] = [
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: -1 },
  { x: -1, y: 1, z: 0 },
  { x: -1, y: 0, z: 1 },
  { x: 0, y: -1, z: 1 }
];

export function cellIdFromOffset(x: number, z: number): string {
  return `${x},${z}`;
}

export function fromOffsetCoordinates(x: number, z: number): HexCoordinates {
  const axialX = x - Math.floor(z / 2);
  return { x: axialX, y: -axialX - z, z };
}

export function offsetToWorld(x: number, z: number, elevation = 0): { x: number; y: number; z: number } {
  return {
    x: (x + z * 0.5 - Math.floor(z / 2)) * (INNER_RADIUS * 2),
    y: elevation,
    z: z * (OUTER_RADIUS * 1.5)
  };
}

export function neighborOffset(coord: OffsetCoordinates, direction: HexDirection): OffsetCoordinates {
  const cube = fromOffsetCoordinates(coord.x, coord.z);
  const dir = HEX_DIRECTIONS[direction];
  return cubeToOffset({
    x: cube.x + dir.x,
    y: cube.y + dir.y,
    z: cube.z + dir.z
  });
}

export function cubeToOffset(coord: HexCoordinates): OffsetCoordinates {
  return {
    x: coord.x + Math.floor(coord.z / 2),
    z: coord.z
  };
}

export function worldToOffset(worldX: number, worldZ: number): OffsetCoordinates {
  const fractionalZ = worldZ / (OUTER_RADIUS * 1.5);
  const z = Math.round(fractionalZ);
  const x = Math.round(worldX / (INNER_RADIUS * 2) - z * 0.5 + Math.floor(z / 2));
  return { x, z };
}
