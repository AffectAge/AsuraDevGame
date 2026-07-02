import type { CellColor } from "../../../../shared/src";

export type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export function toRgba(color: CellColor): Rgba {
  return { r: color.r, g: color.g, b: color.b, a: 1 };
}

export function lerpColor(a: Rgba, b: Rgba, t: number): Rgba {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t
  };
}
