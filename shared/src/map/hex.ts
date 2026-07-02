export type Axial = {
  q: number;
  r: number;
};

export type CubeCoord = {
  q: number;
  r: number;
  s: number;
};

export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

export const SQRT_3 = Math.sqrt(3);

export const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
] as const satisfies readonly Axial[];

export function tileId(q: number, r: number): string {
  return `${q},${r}`;
}

export function axialToCube(hex: Axial): CubeCoord {
  return { q: hex.q, r: hex.r, s: -hex.q - hex.r };
}

export function cubeToAxial(cube: CubeCoord): Axial {
  return { q: cube.q, r: cube.r };
}

export function cubeRound(q: number, r: number, s: number): CubeCoord {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

export function neighbor(hex: Axial, dir: HexDirection): Axial {
  const d = AXIAL_DIRECTIONS[dir];
  return { q: hex.q + d.q, r: hex.r + d.r };
}

export type MapTopologyOptions = {
  wraparound: false;
  coords: Axial[];
};

export class MapTopology {
  readonly wraparound: false;
  private readonly coordIds: Set<string>;

  constructor(options: MapTopologyOptions) {
    this.wraparound = options.wraparound;
    this.coordIds = new Set(options.coords.map((coord) => tileId(coord.q, coord.r)));
  }

  normalizeCoord(coord: Axial): Axial | null {
    return this.coordIds.has(tileId(coord.q, coord.r)) ? coord : null;
  }

  getNeighbor(coord: Axial, dir: HexDirection): Axial | null {
    return this.normalizeCoord(neighbor(coord, dir));
  }

  getNeighborIds(coord: Axial): string[] {
    const ids: string[] = [];
    for (let dir = 0; dir < 6; dir += 1) {
      const n = this.getNeighbor(coord, dir as HexDirection);
      if (n) ids.push(tileId(n.q, n.r));
    }
    return ids;
  }
}

export function hexDistance(a: Axial, b: Axial): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return (Math.abs(ac.q - bc.q) + Math.abs(ac.r - bc.r) + Math.abs(ac.s - bc.s)) / 2;
}

export function hexLerp(a: CubeCoord, b: CubeCoord, t: number): CubeCoord {
  return {
    q: a.q * (1 - t) + b.q * t,
    r: a.r * (1 - t) + b.r * t,
    s: a.s * (1 - t) + b.s * t
  };
}

export function hexLineDraw(a: Axial, b: Axial): Axial[] {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  const distance = hexDistance(a, b);
  const nudgeA = { q: ac.q + 1e-6, r: ac.r + 1e-6, s: ac.s - 2e-6 };
  const nudgeB = { q: bc.q + 1e-6, r: bc.r + 1e-6, s: bc.s - 2e-6 };
  const step = 1 / Math.max(distance, 1);
  const results: Axial[] = [];

  for (let i = 0; i <= distance; i += 1) {
    const h = hexLerp(nudgeA, nudgeB, step * i);
    results.push(cubeToAxial(cubeRound(h.q, h.r, h.s)));
  }

  return results;
}

export function hexRing(center: Axial, radius: number): Axial[] {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new Error("hexRing radius must be a non-negative integer");
  }
  if (radius === 0) return [center];

  const results: Axial[] = [];
  let hex: Axial = {
    q: center.q + AXIAL_DIRECTIONS[4].q * radius,
    r: center.r + AXIAL_DIRECTIONS[4].r * radius
  };

  for (let side = 0; side < 6; side += 1) {
    for (let step = 0; step < radius; step += 1) {
      results.push(hex);
      hex = neighbor(hex, side as HexDirection);
    }
  }

  return results;
}

export function hexRange(center: Axial, radius: number): Axial[] {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new Error("hexRange radius must be a non-negative integer");
  }

  const results: Axial[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r += 1) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}

export type HexLayout = {
  orientation: "flatTop";
  hexSize: number;
  origin: { x: number; z: number };
};

export function hexToWorld(q: number, r: number, layoutOrSize: HexLayout | number): { x: number; z: number } {
  const size = typeof layoutOrSize === "number" ? layoutOrSize : layoutOrSize.hexSize;
  const origin = typeof layoutOrSize === "number" ? { x: 0, z: 0 } : layoutOrSize.origin;
  return {
    x: origin.x + size * ((3 / 2) * q),
    z: origin.z + size * (SQRT_3 * (r + q / 2))
  };
}

export function worldToFractionalHex(x: number, z: number, layoutOrSize: HexLayout | number): { q: number; r: number } {
  const size = typeof layoutOrSize === "number" ? layoutOrSize : layoutOrSize.hexSize;
  const origin = typeof layoutOrSize === "number" ? { x: 0, z: 0 } : layoutOrSize.origin;
  const px = x - origin.x;
  const pz = z - origin.z;
  return {
    q: ((2 / 3) * px) / size,
    r: ((-1 / 3) * px + (SQRT_3 / 3) * pz) / size
  };
}

export function worldToHex(x: number, z: number, layoutOrSize: HexLayout | number): Axial {
  const f = worldToFractionalHex(x, z, layoutOrSize);
  const c = cubeRound(f.q, f.r, -f.q - f.r);
  return { q: c.q, r: c.r };
}

export function hexCorner(q: number, r: number, corner: number, layout: HexLayout): { x: number; z: number } {
  const center = hexToWorld(q, r, layout);
  const angle = (Math.PI / 180) * (60 * corner);
  return {
    x: center.x + layout.hexSize * Math.cos(angle),
    z: center.z + layout.hexSize * Math.sin(angle)
  };
}

export function createRectangleCoords(width: number, height: number): Axial[] {
  const coords: Axial[] = [];
  for (let q = 0; q < width; q += 1) {
    for (let r = 0; r < height; r += 1) {
      coords.push({ q, r });
    }
  }
  return coords;
}
