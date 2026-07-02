export const OUTER_RADIUS = 10;
export const OUTER_TO_INNER = 0.866025404;
export const INNER_RADIUS = OUTER_RADIUS * OUTER_TO_INNER;
export const SOLID_FACTOR = 0.75;
export const BLEND_FACTOR = 1 - SOLID_FACTOR;
export const ELEVATION_STEP = 3;
export const TERRACES_PER_SLOPE = 2;
export const TERRACE_STEPS = TERRACES_PER_SLOPE * 2 + 1;
export const HORIZONTAL_TERRACE_STEP_SIZE = 1 / TERRACE_STEPS;
export const VERTICAL_TERRACE_STEP_SIZE = 1 / (TERRACES_PER_SLOPE + 1);

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export const HEX_CORNERS: readonly Vec3[] = [
  { x: 0, y: 0, z: OUTER_RADIUS },
  { x: INNER_RADIUS, y: 0, z: 0.5 * OUTER_RADIUS },
  { x: INNER_RADIUS, y: 0, z: -0.5 * OUTER_RADIUS },
  { x: 0, y: 0, z: -OUTER_RADIUS },
  { x: -INNER_RADIUS, y: 0, z: -0.5 * OUTER_RADIUS },
  { x: -INNER_RADIUS, y: 0, z: 0.5 * OUTER_RADIUS },
  { x: 0, y: 0, z: OUTER_RADIUS }
];

export function terraceLerp(a: Vec3, b: Vec3, step: number): Vec3 {
  const h = step * HORIZONTAL_TERRACE_STEP_SIZE;
  const v = Math.floor((step + 1) / 2) * VERTICAL_TERRACE_STEP_SIZE;
  return {
    x: a.x + (b.x - a.x) * h,
    y: a.y + (b.y - a.y) * v,
    z: a.z + (b.z - a.z) * h
  };
}
