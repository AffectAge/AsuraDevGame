import type { HexCoordinates, HexDirection } from "../hex/coordinates";

export type CellColorId = "red" | "green" | "blue" | "yellow" | "orange";

export type CellColor = {
  id: CellColorId;
  r: number;
  g: number;
  b: number;
};

export type EdgeType = "flat" | "slope" | "cliff";

export type HexMapSettings = {
  seed: string;
  width: number;
  height: number;
};

export type HexCell = {
  id: string;
  offset: {
    x: number;
    z: number;
  };
  coordinates: HexCoordinates;
  colorId: CellColorId;
  color: CellColor;
  elevation: number;
};

export type HexCellEdge = {
  direction: HexDirection;
  neighborId: string | null;
  edgeType: EdgeType;
};

export type HexGridArtifact = {
  schemaVersion: "ancestors.hex-grid.v1";
  generatorVersion: string;
  settings: HexMapSettings;
  layout: {
    outerRadius: number;
    innerRadius: number;
    elevationStep: number;
  };
  cells: HexCell[];
  edgesByCellId: Record<string, HexCellEdge[]>;
  bounds: {
    width: number;
    height: number;
    worldMinX: number;
    worldMaxX: number;
    worldMinZ: number;
    worldMaxZ: number;
  };
};
