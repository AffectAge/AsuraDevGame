import type { BaseTerrainId, MapTile } from "../../../../shared/src/map";

const defaultTerrainPalette: Record<BaseTerrainId, string> = {
  ocean: "#1f5f8f",
  coast: "#3c8fb2",
  lake: "#2f75a3",
  plains: "#b8b36a",
  grassland: "#6fa35d",
  desert: "#d0b16a",
  tundra: "#96a88f",
  snow: "#d8dee2"
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255
  };
}

export function tileColor(tile: MapTile, palette: Partial<Record<BaseTerrainId, string>> = {}): { r: number; g: number; b: number; a: number } {
  const base = hexToRgb(palette[tile.baseTerrain] ?? defaultTerrainPalette[tile.baseTerrain]);
  const relief = tile.elevationClass === "mountains" ? 0.78 : tile.elevationClass === "hills" ? 0.9 : 1;
  const vegetationBoost = tile.vegetation === "forest" ? { r: 0.78, g: 0.95, b: 0.78 } : tile.vegetation === "rainforest" ? { r: 0.68, g: 1.04, b: 0.68 } : { r: 1, g: 1, b: 1 };
  const jitter = 1 + tile.visual.colorJitter;
  return {
    r: Math.min(1, base.r * relief * vegetationBoost.r * jitter),
    g: Math.min(1, base.g * relief * vegetationBoost.g * jitter),
    b: Math.min(1, base.b * relief * vegetationBoost.b * jitter),
    a: 1
  };
}
