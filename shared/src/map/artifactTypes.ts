import type { HexDirection, HexLayout } from "./hex";

export type TileId = string;

export type BaseTerrainId = "ocean" | "coast" | "lake" | "plains" | "grassland" | "desert" | "tundra" | "snow";
export type ElevationClass = "flat" | "hills" | "mountains";
export type VegetationId = "none" | "forest" | "rainforest";
export type WetlandId = "none" | "marsh";
export type BiomeId = "temperate" | "boreal" | "tropical" | "arid" | "cold" | "wetland";
export type RegionType = "landmass" | "island" | "continent" | "sea" | "ocean" | "lake" | "climate" | "province";
export type EdgeType = "same" | "coast" | "river" | "cliff" | "regionBorder" | "mapEdge";

export type MapGenerationSettings = {
  seed: string;
  width: number;
  height: number;
  shape: "rectangle" | "hexagon" | "irregular";
  orientation: "flatTop";
  wraparound: false;
  worldAge: "young" | "normal" | "old";
  temperature: "cold" | "temperate" | "hot";
  rainfall: "dry" | "normal" | "wet";
  seaLevel: "low" | "normal" | "high";
  landmass: {
    mode: "continents" | "pangaea" | "archipelago" | "islands";
    continentCount?: number;
    islandDensity?: number;
  };
  rivers: {
    enabled: boolean;
    density: number;
  };
  lakes: {
    enabled: boolean;
    density: number;
  };
  resources: {
    enabled: boolean;
    strategicDensity: number;
    luxuryDensity: number;
    bonusDensity: number;
  };
  regions: {
    generateContinents: boolean;
    generateSeas: boolean;
    generateClimateRegions: boolean;
    generateProvinceRegions: boolean;
  };
  debug?: {
    includeNoiseFields?: boolean;
    includeGenerationLayers?: boolean;
  };
};

export type MapTile = {
  id: TileId;
  q: number;
  r: number;
  baseTerrain: BaseTerrainId;
  elevationClass: ElevationClass;
  vegetation: VegetationId;
  wetland: WetlandId;
  biome: BiomeId;
  elevation: number;
  moisture: number;
  temperature: number;
  isWater: boolean;
  isCoastal: boolean;
  isLake: boolean;
  isRiver: boolean;
  movementCost: number;
  passable: boolean;
  regionIds: string[];
  visual: {
    terrainVariant: number;
    colorJitter: number;
    propSetId?: string;
    decalSetId?: string;
  };
  resources?: {
    resourceId: string;
    category: "bonus" | "luxury" | "strategic";
    amount?: number;
  }[];
};

export type TileEdge = {
  dir: HexDirection;
  neighborId: TileId | null;
  edgeTypes: EdgeType[];
  primaryEdgeType: EdgeType;
  riverId?: string;
  regionBorderIds?: string[];
  noiseSeed: number;
  noiseAmplitude: number;
  noiseWavelength: number;
};

export type TileCorner = {
  id: string;
  x: number;
  z: number;
};

export type MapRegion = {
  id: string;
  type: RegionType;
  name?: string;
  tileIds: TileId[];
  parentRegionId?: string;
  visual: {
    colorIndex: number;
    borderStyle: "none" | "soft" | "hard" | "political" | "coast";
  };
};

export type RiverSegment = {
  id: string;
  fromCorner: string;
  toCorner: string;
  leftTileId: TileId;
  rightTileId: TileId;
  flow: number;
  strahler: number;
  width: number;
  noiseSeed: number;
};

export type BorderSegment = {
  id: string;
  type: "coast" | "river" | "region" | "mapEdge";
  tileA: TileId;
  tileB: TileId | null;
  dirFromA: HexDirection;
  polyline: { x: number; z: number }[];
  noiseSeed: number;
};

export type MapRenderHints = {
  heightScale: number;
  terrainPalette: Record<BaseTerrainId, string>;
  biomeTints: Record<BiomeId, string>;
  waterLevel: number;
};

export type GeneratedMapArtifact = {
  schemaVersion: "map-artifact.v1";
  generatorVersion: string;
  id: string;
  seed: string;
  deterministicHash: string;
  metadata: {
    createdAt: string;
    storageRevision?: number;
  };
  settings: MapGenerationSettings;
  layout: HexLayout;
  bounds: {
    qMin: number;
    qMax: number;
    rMin: number;
    rMax: number;
    worldMinX: number;
    worldMaxX: number;
    worldMinZ: number;
    worldMaxZ: number;
  };
  tiles: MapTile[];
  topology: {
    neighborsByTileId: Record<TileId, TileId[]>;
    edgesByTileId: Record<TileId, TileEdge[]>;
    cornersByTileId?: Record<TileId, TileCorner[]>;
  };
  regions: MapRegion[];
  rivers: RiverSegment[];
  borders: BorderSegment[];
  renderHints: MapRenderHints;
};

export type DeterministicMapContent = Pick<
  GeneratedMapArtifact,
  "generatorVersion" | "seed" | "settings" | "layout" | "bounds" | "tiles" | "topology" | "regions" | "rivers" | "borders" | "renderHints"
>;
