import type { CellColor, CellColorId } from "./types";

export const cellColors: Record<CellColorId, CellColor> = {
  red: { id: "red", r: 0.83, g: 0.22, b: 0.17 },
  green: { id: "green", r: 0.26, g: 0.58, b: 0.24 },
  blue: { id: "blue", r: 0.19, g: 0.42, b: 0.82 },
  yellow: { id: "yellow", r: 0.82, g: 0.74, b: 0.26 },
  orange: { id: "orange", r: 0.86, g: 0.45, b: 0.18 }
};

export const colorIds = Object.keys(cellColors) as CellColorId[];
