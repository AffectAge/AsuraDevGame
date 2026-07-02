import {
  ELEVATION_STEP,
  INNER_RADIUS,
  OUTER_RADIUS,
  cellColors,
  cellIdFromOffset,
  colorIds,
  defaultMapSettings,
  fromOffsetCoordinates,
  neighborOffset,
  offsetToWorld,
  type EdgeType,
  type HexCell,
  type HexCellEdge,
  type HexGridArtifact,
  type HexMapSettings
} from "../../../shared/src";
import { createRng } from "./rng";

const GENERATOR_VERSION = "ancestors-generator.v1";

export function generateMap(input: Partial<HexMapSettings> = {}): HexGridArtifact {
  const settings = normalizeSettings(input);
  const rng = createRng(settings.seed);
  const cells: HexCell[] = [];
  const cellsById = new Map<string, HexCell>();

  for (let z = 0; z < settings.height; z += 1) {
    for (let x = 0; x < settings.width; x += 1) {
      const id = cellIdFromOffset(x, z);
      const colorId = colorIds[Math.floor(rng() * colorIds.length)] ?? "green";
      const elevation = demoElevation(x, z, settings, rng);
      const cell: HexCell = {
        id,
        offset: { x, z },
        coordinates: fromOffsetCoordinates(x, z),
        colorId,
        color: cellColors[colorId],
        elevation
      };
      cells.push(cell);
      cellsById.set(id, cell);
    }
  }

  const edgesByCellId = buildEdges(cells, cellsById, settings);
  const bounds = buildBounds(cells);

  return {
    schemaVersion: "ancestors.hex-grid.v1",
    generatorVersion: GENERATOR_VERSION,
    settings,
    layout: {
      outerRadius: OUTER_RADIUS,
      innerRadius: INNER_RADIUS,
      elevationStep: ELEVATION_STEP
    },
    cells,
    edgesByCellId,
    bounds
  };
}

function normalizeSettings(input: Partial<HexMapSettings>): HexMapSettings {
  return {
    seed: input.seed ?? defaultMapSettings.seed,
    width: clampInteger(input.width ?? defaultMapSettings.width, 2, 80),
    height: clampInteger(input.height ?? defaultMapSettings.height, 2, 80)
  };
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function demoElevation(x: number, z: number, settings: HexMapSettings, rng: () => number): number {
  const nx = x / Math.max(1, settings.width - 1);
  const nz = z / Math.max(1, settings.height - 1);
  const ridge = Math.sin(nx * Math.PI * 2.2 + nz * Math.PI * 0.7) * 1.2;
  const slope = (1 - Math.abs(nx - 0.55) * 1.6) * 2.2;
  const noise = (rng() - 0.5) * 1.8;
  return Math.max(0, Math.min(5, Math.round(ridge + slope + noise + 1.2)));
}

function buildEdges(cells: HexCell[], cellsById: Map<string, HexCell>, settings: HexMapSettings): Record<string, HexCellEdge[]> {
  const edgesByCellId: Record<string, HexCellEdge[]> = {};
  for (const cell of cells) {
    const edges: HexCellEdge[] = [];
    for (let direction = 0; direction < 6; direction += 1) {
      const neighborCoord = neighborOffset(cell.offset, direction as HexCellEdge["direction"]);
      const neighborId =
        neighborCoord.x >= 0 && neighborCoord.x < settings.width && neighborCoord.z >= 0 && neighborCoord.z < settings.height
          ? cellIdFromOffset(neighborCoord.x, neighborCoord.z)
          : null;
      const neighbor = neighborId ? cellsById.get(neighborId) ?? null : null;
      edges.push({
        direction: direction as HexCellEdge["direction"],
        neighborId,
        edgeType: neighbor ? classifyEdge(cell.elevation, neighbor.elevation) : "cliff"
      });
    }
    edgesByCellId[cell.id] = edges;
  }
  return edgesByCellId;
}

export function classifyEdge(aElevation: number, bElevation: number): EdgeType {
  const delta = Math.abs(aElevation - bElevation);
  if (delta === 0) return "flat";
  if (delta === 1) return "slope";
  return "cliff";
}

function buildBounds(cells: HexCell[]): HexGridArtifact["bounds"] {
  const centers = cells.map((cell) => offsetToWorld(cell.offset.x, cell.offset.z, cell.elevation * ELEVATION_STEP));
  return {
    width: Math.max(...cells.map((cell) => cell.offset.x)) + 1,
    height: Math.max(...cells.map((cell) => cell.offset.z)) + 1,
    worldMinX: Math.min(...centers.map((center) => center.x)) - OUTER_RADIUS,
    worldMaxX: Math.max(...centers.map((center) => center.x)) + OUTER_RADIUS,
    worldMinZ: Math.min(...centers.map((center) => center.z)) - OUTER_RADIUS,
    worldMaxZ: Math.max(...centers.map((center) => center.z)) + OUTER_RADIUS
  };
}
