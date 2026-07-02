# map.md — Agent Plan: серверный генератор hex-карты для браузерной 2.5D стратегии на Babylon.js

## 0. Назначение документа

Этот документ задаёт правила для ИИ-агента, который должен создать **модуль генерации и отображения hex-карты** для пошаговой браузерной стратегии на **Babylon.js**.

Цель: сервер по настройкам партии генерирует детерминированный артефакт карты, клиент загружает этот артефакт и отображает его в 2.5D-стиле: flat-top hexes, камера как в Civilization-подобной стратегии, точный hover/pick, границы регионов, береговые линии, маршруты, подсветки и shader-ready noisy borders.

Документ не описывает экономику, дипломатию, боевую систему, ИИ игроков или мультиплеерную синхронизацию ходов.

---

## 1. Источники и обязательный подход

Агент обязан использовать подходы Red Blob Games:

1. **Hexagonal Grids**
   - axial coordinates для хранения: `q, r`;
   - cube coordinates для алгоритмов: `q, r, s`, где `s = -q - r`;
   - flat-top hex orientation;
   - hex-to-pixel и pixel-to-hex через layout;
   - neighbors, distance, rings, ranges, line drawing, pathfinding.

2. **Hex to pixel**
   - карта должна иметь единый layout-объект;
   - нельзя размазывать формулы позиционирования по разным частям кода;
   - все world positions выводятся только через `hexToWorld()`.

3. **Wraparound**
   - архитектурно предусмотреть опцию `wraparound`, но по умолчанию и для первой версии она должна быть `false`;
   - если `wraparound=false`, край карты является настоящим краем;
   - если позже будет включён wraparound, он должен реализовываться через отдельный `MapTopology`, а не через хаки в рендере.

4. **Noisy hex rendering**
   - визуальные неровные границы не должны ломать координатную сетку;
   - логическая карта остаётся идеальной hex-сеткой;
   - noisy borders реализуются как визуальный слой: mesh/shader data, barycentric/corner-triangle data или заранее сгенерированные border polylines.

### 1.1 Local reference code

The repository may include `map_code_example.md`, generated from Red Blob Games hex grid code.

Rules:
- treat it as a reference implementation for hex math, layout conversion, rounding, directions, line drawing, and tests;
- port only the needed parts into project modules instead of importing the markdown file directly;
- keep project storage in axial `q,r`;
- do not switch the project to offset or doubled coordinates just because the reference file contains them;
- use the reference tests as a baseline for project unit tests.

---

## 2. Главный архитектурный принцип

Сервер и клиент разделены жёстко.

```txt
server/
  генерирует карту
  валидирует настройки
  создаёт deterministic map artifact
  хранит seed, настройки, tiles, regions, topology, rivers, borders

client/
  не генерирует мир
  не меняет topology
  не решает, где море/суша/биомы/ресурсы
  только загружает map artifact
  строит Babylon.js-сцену
  выполняет hover, selection, camera, overlays
```

Клиент может иметь только lightweight helpers:
- `hexToWorld`;
- `worldToHex`;
- lookup tile by id;
- получение соседей из уже готового topology;
- визуальные фильтры;
- route preview по серверным movement-cost данным, если они присутствуют в artifact.

---

## 3. Обязательные non-goals первой версии

Агент не должен добавлять:

- gameplay simulation;
- юнитов как полноценную механику;
- экономику;
- дипломатические данные;
- fog of war как серверную механику;
- сохранения партии;
- редактор карты;
- procedural generation на клиенте;
- hardcoded тестовую карту внутри Babylon scene;
- fallback-генерацию на клиенте при ошибке загрузки.

Если artifact не загружен — клиент показывает ошибку, а не генерирует замену.

---

## 4. Термины

```ts
type HexCoord = {
  q: number;
  r: number;
};

type CubeCoord = {
  q: number;
  r: number;
  s: number; // always -q-r
};

type TileId = string; // format: "q,r"

type BaseTerrainId =
  | "ocean"
  | "coast"
  | "lake"
  | "plains"
  | "grassland"
  | "desert"
  | "tundra"
  | "snow";

type ElevationClass =
  | "flat"
  | "hills"
  | "mountains";

type VegetationId =
  | "none"
  | "forest"
  | "rainforest";

type WetlandId =
  | "none"
  | "marsh";

type BiomeId =
  | "temperate"
  | "boreal"
  | "tropical"
  | "arid"
  | "cold"
  | "wetland";

type RegionType =
  | "landmass"
  | "island"
  | "continent"
  | "sea"
  | "ocean"
  | "lake"
  | "climate"
  | "province";
```

---

## 5. Coordinate system

### 5.1 Storage coordinates

Сервер хранит каждый hex в axial coordinates:

```ts
type Axial = {
  q: number;
  r: number;
};
```

`s` не хранить в JSON, кроме debug-полей.

```ts
function axialToCube(h: Axial): CubeCoord {
  return { q: h.q, r: h.r, s: -h.q - h.r };
}
```

### 5.2 Flat-top orientation

Использовать **flat-top hexes**.

В world-space Babylon.js:

```txt
x = horizontal world axis
z = depth world axis
y = height/elevation axis
```

То есть hex лежит в плоскости `x/z`, а высота/рельеф идёт по `y`.

### 5.3 Hex to world

Для flat-top axial layout:

```ts
const SQRT_3 = Math.sqrt(3);

function hexToWorld(q: number, r: number, size: number): { x: number; z: number } {
  return {
    x: size * (3 / 2 * q),
    z: size * (SQRT_3 * (r + q / 2)),
  };
}
```

### 5.4 World to hex

```ts
function worldToFractionalHex(x: number, z: number, size: number): { q: number; r: number } {
  return {
    q: (2 / 3 * x) / size,
    r: (-1 / 3 * x + Math.sqrt(3) / 3 * z) / size,
  };
}
```

После этого нужен cube rounding:

```ts
function cubeRound(q: number, r: number, s: number): CubeCoord {
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

function worldToHex(x: number, z: number, size: number): Axial {
  const f = worldToFractionalHex(x, z, size);
  const c = cubeRound(f.q, f.r, -f.q - f.r);
  return { q: c.q, r: c.r };
}
```

---

## 6. Map settings

Сервер принимает настройки карты.

```ts
type MapGenerationSettings = {
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
```

Правило: одинаковые `settings + generatorVersion` должны давать одинаковое deterministic map content.

Deterministic content включает:
- `layout`;
- `bounds`;
- `tiles`;
- `topology`;
- `regions`;
- `rivers`;
- `borders`;
- `renderHints`.

Operational metadata вроде `id`, `createdAt`, storage revision, database timestamps, cache keys и API response headers не участвуют в deterministic hash.

---

## 7. Map artifact contract

Сервер сохраняет и отдаёт карту как JSON.

```ts
type GeneratedMapArtifact = {
  schemaVersion: "map-artifact.v1";
  generatorVersion: string;

  id: string;
  seed: string;

  metadata: {
    createdAt: string; // operational metadata; excluded from deterministic hash
    storageRevision?: number;
  };

  settings: MapGenerationSettings;

  layout: {
    orientation: "flatTop";
    hexSize: number;
    origin: { x: number; z: number };
  };

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
```

### 7.1 Tile

```ts
type MapTile = {
  id: TileId;
  q: number;
  r: number;

  baseTerrain: BaseTerrainId;
  elevationClass: ElevationClass;
  vegetation: VegetationId;
  wetland: WetlandId;
  biome: BiomeId;

  elevation: number; // normalized 0..1
  moisture: number;  // normalized 0..1
  temperature: number; // normalized 0..1

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
```

### 7.2 Edges

Hex has 6 directions.

```ts
type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

type EdgeType =
  | "same"
  | "coast"
  | "river"
  | "cliff"
  | "regionBorder"
  | "mapEdge";

type TileEdge = {
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
```

### 7.3 Regions

```ts
type MapRegion = {
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
```

### 7.4 Rivers

```ts
type RiverSegment = {
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
```

### 7.5 Borders

```ts
type BorderSegment = {
  id: string;
  type: "coast" | "river" | "region" | "mapEdge";
  tileA: TileId;
  tileB: TileId | null;
  dirFromA: HexDirection;
  polyline: { x: number; z: number }[];
  noiseSeed: number;
};
```

---

## 8. Server generation pipeline

Агент должен реализовать генерацию как чистый pipeline.

```txt
validateSettings()
createSeededRng()
createCoordinateSet()
buildTopology()
generateBaseNoiseFields()
generateElevation()
classifyWaterLand()
generateLakes()
finalizeWaterLand()
generateTemperature()
generateMoisture()
classifyBiomes()
classifyTerrain()
detectCoasts()
generateRivers()
generateRegions()
generateResources()
annotateTopologyEdges()
buildBorders()
buildRenderHints()
validateArtifact()
saveArtifact()
```

Каждый этап должен быть отдельным модулем.

---

## 9. Server modules

```txt
server/src/map/
  index.ts

  generation/
    generateMap.ts
    validateMapSettings.ts
    createCoordinateSet.ts
    generateNoiseFields.ts
    generateElevation.ts
    classifyWaterLand.ts
    generateLakes.ts
    finalizeWaterLand.ts
    generateClimate.ts
    classifyBiomes.ts
    classifyTerrain.ts
    detectCoasts.ts
    generateRivers.ts
    generateRegions.ts
    generateResources.ts
    buildTopology.ts
    annotateTopologyEdges.ts
    buildBorders.ts
    buildRenderHints.ts
    validateArtifact.ts

  hex/
    hexTypes.ts
    axial.ts
    cube.ts
    directions.ts
    distance.ts
    rings.ts
    ranges.ts
    lineDraw.ts
    layout.ts
    mapShape.ts
    mapTopology.ts

  storage/
    mapArtifactTypes.ts
    saveMapArtifact.ts
    loadMapArtifact.ts

  api/
    mapRoutes.ts
```

---

## 10. Client modules

```txt
client/src/map/
  index.ts

  data/
    mapArtifactTypes.ts
    loadMapArtifact.ts
    mapLookup.ts

  hex/
    axial.ts
    cube.ts
    layout.ts
    picking.ts

  scene/
    createMapScene.ts
    createMapCamera.ts
    createLighting.ts

  render/
    MapRenderer.ts
    TerrainMeshLayer.ts
    WaterMeshLayer.ts
    BorderMeshLayer.ts
    RiverMeshLayer.ts
    RegionOverlayLayer.ts
    HighlightLayer.ts
    RoutePreviewLayer.ts
    PropLayer.ts

  shaders/
    terrainMaterial.ts
    waterMaterial.ts
    noisyBorderMaterial.ts
    regionOverlayMaterial.ts

  interaction/
    MapInputController.ts
    HoverController.ts
    SelectionController.ts
    CameraController.ts
```

---

## 11. Terrain generation requirements

### 11.1 Elevation

Server must generate normalized `elevation: 0..1`.

Recommended approach:

- use deterministic seeded noise;
- combine multiple octaves;
- apply landmass mask;
- apply sea level threshold;
- add mountain ridges according to `worldAge`.

```txt
young world  -> sharper mountains, more roughness
normal world -> balanced elevation
old world    -> smoother terrain, fewer sharp peaks
```

### 11.2 Sea level

```txt
low    -> less water
normal -> balanced
high   -> more water
```

Water classification:

```ts
if elevation < seaThreshold:
  baseTerrain = "ocean"
else:
  baseTerrain = land base terrain
```

`generateLakes()` runs before `detectCoasts()`. Coast detection must happen only after all water sources are finalized, including ocean, coast water, and lakes.

### 11.3 Coasts

A land tile is coastal if at least one neighbor is water.

A water tile is coast if:
- it is water;
- at least one neighbor is land;
- it is not a lake.

### 11.4 Biomes

Biome must be derived from:
- temperature;
- moisture;
- latitude factor;
- elevation.

Example:

```txt
hot + dry       -> arid/desert
hot + wet       -> tropical/rainforest
temperate + wet -> temperate/forest/grassland
cold + dry      -> tundra/snow
high elevation  -> hills/mountains
```

### 11.5 Terrain layers

Terrain is stored as layered classification, not as one overloaded field.

```ts
baseTerrain    -> ocean / coast / lake / plains / grassland / desert / tundra / snow
elevationClass -> flat / hills / mountains
vegetation     -> none / forest / rainforest
wetland        -> none / marsh
```

Rules:
- `baseTerrain` is the ground or water type.
- `elevationClass` describes relief and can combine with land terrain.
- `vegetation` describes forest cover and can combine with flat or hilly land.
- `wetland` is a feature layer and does not replace the base terrain by itself.
- water tiles normally use `elevationClass="flat"`, `vegetation="none"`, `wetland="none"` unless a later visual system explicitly supports otherwise.

Examples:

```txt
grassland + hills + forest
plains + flat + marsh
tundra + mountains + none
coast + flat + none
```

---

## 12. Rivers

Rivers are generated on hex edges/corners, not as terrain replacing whole tiles.

The river design follows two Red Blob Games ideas:
- drainage basins can be generated as a directed tree grown from water exits or low points, using BFS/Dijkstra-like growth guided by noise;
- visual river rendering should be shader-ready, with river width/flow data available for later curved or triangle-based rendering.

References:
- https://www.redblobgames.com/x/1723-procedural-river-growing/
- https://www.redblobgames.com/blog/2025-09-30-mapgen4-river-shader/

### 12.1 Generation model

First implementation uses hex-edge river network data, not center-to-center lines.

Rules:

- river starts from high elevation or wet highland;
- river flows downhill;
- river ends in ocean, lake, or map edge;
- river segment is stored as edge/corner geometry;
- tile has `isRiver=true` only as helper flag;
- visual river mesh follows edge/corner path;
- rivers may use noisy polyline points.

Do not render rivers as straight center-to-center blue lines.

### 12.2 Drainage basin approach

The generator should build a directed drainage graph before producing final river segments.

Recommended first approach:

```txt
1. Choose sinks: ocean-adjacent land edges, lakes, or valid map-edge exits.
2. Grow drainage basins inward from sinks using a priority queue.
3. Priority = elevation cost + noise bias + distance cost.
4. Store for each land tile/edge its downstream neighbor or outlet.
5. Accumulate flow from upstream tiles.
6. Emit visible river segments only where accumulated flow passes a threshold.
7. Convert river graph edges into RiverSegment records with width based on flow.
```

This gives a tree-like drainage structure: small streams join into wider rivers, and water has a consistent downstream direction.

### 12.3 Strahler and flow

River importance should be derived from the drainage graph:

```txt
source stream -> Strahler 1
two equal streams join -> order increases by 1
unequal streams join -> larger order is preserved
```

The artifact must store enough data for rendering width:

```ts
flow: number;         // accumulated upstream water
strahler: number;     // stream order
width: number;        // render width derived from flow/order
```

### 12.4 First milestone policy

For the minimal vertical slice, rivers are optional but the data contract must be ready.

Allowed first milestone behavior:
- `rivers.enabled=false` in the default 96x64 preset; or
- `rivers.enabled=true` generates the drainage graph and `RiverSegment[]`, but river rendering may be a simple strip/polyline layer.

Not allowed:
- fake center-to-center blue lines;
- rivers that ignore elevation/drainage direction;
- client-side river generation.

### 12.5 Future shader-ready rendering

Future rendering may use a triangle/corner representation inspired by Mapgen4:
- river curves are drawn inside triangle/corner regions;
- shader receives flow/width and local coordinates;
- river sides may be curved in shader rather than baked into many mesh vertices;
- confluences need enough topology data to know which river segments enter and leave a corner/triangle.

The first implementation does not need the full shader. It must keep enough artifact data to support it later.

---

## 13. Noisy borders

### 13.1 Logical border vs visual border

Logical border:

```txt
tile A dir 2 neighbor tile B
edgeTypes = coast / river / regionBorder
```

Visual border:

```txt
polyline or shader displacement
```

The visual border may be noisy. The logical border must remain stable and exact.

### 13.2 Required first implementation

Implement one of these two strategies.

#### Option A — generated noisy polylines

Server or client builds border polylines:

```ts
function buildNoisyEdge(
  start: Vec2,
  end: Vec2,
  seed: number,
  amplitude: number,
  segments: number
): Vec2[]
```

Rules:
- split edge into N segments;
- displace points perpendicular to edge;
- displacement must be deterministic from seed;
- endpoints must remain unchanged;
- adjacent borders must not create visible gaps.

#### Option B — corner triangle / barycentric shader-ready mesh

Use triangle-based dual representation:
- draw corner triangles instead of direct hex faces;
- pass barycentric coordinates to shader;
- shader decides dominant hex/terrain;
- add noise/bias to barycentric coordinates to perturb visual boundaries.

This option is more faithful to the Red Blob noisy shader approach, but harder. It may be implemented after Option A.

### 13.3 Required data for shader-ready future

Even if Option A is implemented first, artifact/render code must keep:

```ts
noiseSeed
noiseAmplitude
noiseWavelength
edgeTypes
primaryEdgeType
tileA
tileB
dirFromA
```

---

## 14. Babylon.js 2.5D rendering

### 14.1 Scene orientation

- map plane: `x/z`;
- elevation: `y`;
- camera angled down;
- flat-top hexes;
- no perspective-breaking billboards for terrain;
- props may be instanced meshes or thin billboards.

### 14.2 Camera

Camera must feel like a Civilization-style strategy camera:

- orthographic or low-distortion perspective;
- angled top-down view;
- pan by mouse drag / middle mouse / WASD;
- zoom with wheel;
- optional rotation disabled for first version;
- clamp camera to map bounds;
- smooth inertial movement;
- hover accuracy must remain correct at all zoom levels.

Recommended:

```ts
camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
camera.rotation = {
  x: approximately 55-65 degrees downward,
  y: 0,
  z: 0
};
```

If using perspective camera:
- keep FOV narrow;
- avoid dramatic perspective;
- preserve readable strategic map.

### 14.3 Mesh layers

Do not create one Babylon mesh per tile for large maps.

Mesh means a renderable 3D object made from shared vertex/index buffers. One mesh can contain thousands of hex faces. This is much faster than creating thousands of separate Babylon objects.

Use batched/merged/custom meshes:

```txt
TerrainMeshLayer   -> large custom mesh for land hex top faces, grouped by material/terrain where needed
WaterMeshLayer     -> separate water surface mesh
BorderMeshLayer    -> separate coast/region/map-edge line or strip mesh
RiverMeshLayer     -> separate river strip mesh
HighlightLayer     -> hover/selection/route overlays
PropLayer          -> instanced vegetation/rocks/decor
```

First implementation geometry:
- cells are flat hex top faces;
- land cells are raised on `y` by `elevation * heightScale`;
- water is rendered as a separate flatter layer near sea level;
- side walls between elevation levels are optional for the first milestone;
- smooth terrain blending is optional for the first milestone;
- terrain picking still uses ray-to-plane/worldToHex, not mesh triangle identity.

Why water is a separate layer:
- water needs different material, animation, transparency, and render ordering;
- water level may be visually flatter than land elevation;
- coast lines are easier to draw when land and water are separate surfaces.

Why coast/border is a separate line or strip:
- border visuals can be changed without rebuilding terrain;
- noisy borders can be regenerated independently;
- hover/selection overlays do not disturb terrain geometry;
- region borders and coast borders may overlap the same edge.

### 14.4 Materials

Required material categories:

```txt
terrain material
water material
coast/border material
region overlay material
highlight material
river material
```

Terrain visuals should support:
- terrain variants;
- color jitter per tile;
- biome tint;
- elevation shading;
- optional splat/noise texture.

---

## 15. Picking and hover

Picking must not depend on mesh triangle identity.

Required approach:

1. Raycast from mouse into map plane.
2. Convert hit point `x,z` to fractional hex.
3. Round to axial hex.
4. Lookup tile by `id = q + "," + r`.
5. If tile exists, set hover.

```ts
function pickHexFromPointer(scene, pointer, layout, mapLookup): MapTile | null {
  const hit = raycastToXZPlane(pointer);
  if (!hit) return null;

  const hex = worldToHex(hit.x, hit.z, layout.hexSize);
  return mapLookup.getTile(hex.q, hex.r) ?? null;
}
```

Do not rely on individual tile mesh picking as the primary system.

---

## 16. Topology and neighbors

Use flat-top axial directions:

```ts
const AXIAL_DIRECTIONS = [
  { q: +1, r: 0 },
  { q: +1, r: -1 },
  { q: 0,  r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: +1 },
  { q: 0,  r: +1 },
] as const;
```

Neighbor lookup:

```ts
function neighbor(hex: Axial, dir: HexDirection): Axial {
  const d = AXIAL_DIRECTIONS[dir];
  return { q: hex.q + d.q, r: hex.r + d.r };
}
```

Server artifact must include `neighborsByTileId`.

Client may recompute direct neighbor coordinates for convenience, but authoritative topology comes from artifact because irregular maps may have missing tiles.

---

## 17. Map shapes

First version must support rectangle.

```ts
function createRectangleCoords(width: number, height: number): Axial[] {
  const coords: Axial[] = [];

  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      coords.push({ q, r });
    }
  }

  return coords;
}
```

Later shapes:

```txt
hexagon radius N
irregular mask
continent-only cropped map
scenario map from file
```

For flat-top storage, encapsulate access in `MapGrid` and do not expose array indexing to gameplay/client code.

---

## 18. Wraparound policy

First version:

```ts
wraparound: false
```

Rules:
- no render world copies;
- no modulo coordinate hack;
- no fake duplicated map mesh;
- camera clamps to actual bounds.

Future version:

```ts
type MapTopology = {
  wraparound: boolean;
  normalizeCoord(coord: Axial): Axial | null;
  getNeighbor(coord: Axial, dir: HexDirection): Axial | null;
}
```

If enabled later, wraparound must be implemented in topology normalization and neighbor lookup, not in terrain generation or Babylon mesh code.

---

## 19. Region and border generation

Regions are generated server-side.

Minimum required regions:
- landmasses;
- oceans/seas;
- optional climate regions;
- optional province regions.

Borders are generated from topology:

```txt
for each tile:
  for each edge:
    if neighbor is null -> mapEdge
    if land vs water -> coast
    if different region -> regionBorder
    if river on edge -> river
```

Do not duplicate shared borders visually.

Rule:
- border between A and B is emitted once;
- canonical key: `min(tileA,tileB) + ":" + max(tileA,tileB) + ":" + borderType`.
- if one logical edge has multiple visual border roles, emit one `BorderSegment` per visual border type, but share the same tile pair and direction.

---

## 20. Resources

Resources are optional in map generator but should be supported in artifact.

Placement rules:
- strategic resources depend on terrain layers/biome/elevation;
- luxury resources should be regionally clustered;
- bonus resources may be more common;
- resources must not spawn on invalid terrain;
- resource generation must be deterministic from seed.

No gameplay yields in first version unless the existing game schema already requires them.

---

## 21. Performance rules

### 21.1 Server

- O(n) or O(n log n) over tile count where possible.
- Avoid all-pairs tile comparisons.
- Use maps keyed by `TileId`.
- Build topology once.
- Validate artifact before saving.
- Store large artifacts compressed or serve them with HTTP compression.

### 21.2 Client

- No one-mesh-per-tile for production maps.
- Use custom mesh buffers or thin instances.
- Static terrain should be immutable after load.
- Dynamic overlays must be separate from terrain mesh.
- Hover/selection should update only overlay data, not rebuild terrain.
- Use texture atlases for terrain variants/props.
- Dispose Babylon resources explicitly when unloading map.

### 21.3 Artifact storage and database policy

The map artifact may be stored either as a JSON file or in a database.

Database storage is allowed, but it must not change the artifact contract:
- the API still returns `GeneratedMapArtifact`;
- server generation remains authoritative;
- client does not query many small tile records to assemble the map;
- deterministic hash ignores database metadata such as row id, insert time, update time, revision id, and cache state.

Recommended database shape for first production version:

```txt
maps table:
  id
  schemaVersion
  generatorVersion
  seed
  settingsJson
  deterministicHash
  artifactJsonCompressed or artifactBlob
  createdAt
  updatedAt
```

Rules:
- store the whole artifact blob for fast loading;
- optionally add indexes on `seed`, `generatorVersion`, `deterministicHash`;
- use gzip/brotli compression for HTTP responses;
- do not normalize every tile into separate rows unless there is a concrete server-side query need.

---

## 22. API

### 22.1 Generate map

```http
POST /api/maps/generate
Content-Type: application/json
```

Body:

```json
{
  "seed": "example-seed",
  "width": 96,
  "height": 64,
  "shape": "rectangle",
  "orientation": "flatTop",
  "wraparound": false,
  "worldAge": "normal",
  "temperature": "temperate",
  "rainfall": "normal",
  "seaLevel": "normal",
  "landmass": {
    "mode": "continents",
    "continentCount": 4
  },
  "rivers": {
    "enabled": true,
    "density": 0.6
  },
  "lakes": {
    "enabled": true,
    "density": 0.25
  },
  "resources": {
    "enabled": true,
    "strategicDensity": 0.5,
    "luxuryDensity": 0.5,
    "bonusDensity": 0.8
  },
  "regions": {
    "generateContinents": true,
    "generateSeas": true,
    "generateClimateRegions": true,
    "generateProvinceRegions": false
  }
}
```

Response:

```json
{
  "mapId": "map_...",
  "artifactUrl": "/api/maps/map_..."
}
```

### 22.2 Load map

```http
GET /api/maps/:mapId
```

Response:

```ts
GeneratedMapArtifact
```

---

## 23. Tests

Required tests:

```txt
hex coordinate tests
hex distance tests
hex rounding tests
hexToWorld/worldToHex roundtrip tests
neighbor direction tests
rectangle coordinate generation tests
topology tests
coast detection tests
determinism tests
artifact schema validation tests
no client fallback generation test
```

Example determinism test:

```ts
it("generates identical artifact for same settings and generator version", () => {
  const a = generateMap(settings);
  const b = generateMap(settings);
  expect(hashArtifact(a)).toEqual(hashArtifact(b));
});
```

---

## 24. Agent implementation order

ИИ-агент обязан выполнять работу в таком порядке:

1. Create shared map artifact types.
2. Implement hex math module.
3. Implement server settings validation.
4. Implement coordinate set generation.
5. Implement deterministic RNG.
6. Implement topology neighbor lookup.
7. Implement basic elevation/noise.
8. Implement water/lake/final water classification.
9. Implement layered terrain classification.
10. Implement coasts.
11. Implement regions.
12. Implement rivers as disabled-by-default placeholder or first drainage-graph version.
13. Annotate topology edges with `edgeTypes`.
14. Implement border generation.
15. Implement artifact validation.
16. Implement API route.
17. Implement client artifact loader.
18. Implement Babylon scene/camera.
19. Implement terrain mesh layer.
20. Implement water mesh layer.
21. Implement picking.
22. Implement hover/selection overlay.
23. Implement border layer.
24. Implement optional river layer.
25. Add tests.
26. Add debug HUD.
27. Remove dead code and temporary fallback paths.

---

## 25. Strict rules for the agent

### Must do

- Use axial `q,r` as stored coordinate.
- Use cube conversion for distance, rounding, rings, ranges.
- Use flat-top orientation.
- Use Babylon world plane `x/z`, height `y`.
- Keep server generation authoritative.
- Keep client rendering deterministic and data-driven.
- Use map artifact as the only source of truth.
- Keep logical hex borders separate from noisy visual borders.
- Use batched/custom meshes for terrain.
- Use ray-to-plane + worldToHex for picking.
- Include tests for hex math and determinism.

### Must not do

- Do not generate terrain on the client.
- Do not create one mesh per tile for production.
- Do not hardcode a demo map inside renderer.
- Do not use offset coordinates as the main internal system.
- Do not mix gameplay logic into rendering.
- Do not implement wraparound by duplicating visible map meshes.
- Do not add fallback map generation.
- Do not leave obsolete files or old systems after replacement.
- Do not put all tests into one file.
- Do not use `V1`, `New`, `Old`, `Temp`, `Final`, `Fixed` in names.
- Do not silently catch errors and continue with fake data.

---

## 26. Acceptance criteria

Map feature is accepted only when:

- Server can generate a deterministic map from settings.
- Artifact can be saved and loaded.
- Client can load artifact and render terrain in Babylon.js.
- Camera pans and zooms smoothly.
- Hover selects the correct hex at all zoom levels.
- Coast/region borders are visible.
- Borders can support noisy visual deformation.
- No client-side procedural world generation exists.
- Tests pass.
- Large maps do not create one mesh per tile.
- Code is modular and ready for gameplay systems later.

---

## 27. Minimal vertical slice

For the first milestone, implement only:

```txt
96x64 rectangle
flat-top axial coordinates
server deterministic generation
land/water/elevation/biome/layered terrain
coast detection
basic regions: landmass + ocean
basic border layer
Babylon terrain mesh with flat raised hex top faces
Babylon water mesh as a separate layer
Babylon camera
hover + selected hex
debug panel with q,r, baseTerrain, elevationClass, vegetation, wetland, elevation, biome
```

Everything else can be added after the vertical slice is stable.
