import { nanoid } from "nanoid";
import {
  type GeneratedMapArtifact,
  type MapGenerationSettings,
  defaultMapSettings
} from "../../../../shared/src/map";
import { annotateTopologyEdges } from "./annotateTopologyEdges";
import { buildBorders } from "./buildBorders";
import { buildBounds } from "./buildBounds";
import { buildRenderHints } from "./buildRenderHints";
import { buildTopology } from "./buildTopology";
import { createCoordinateSet } from "./createCoordinateSet";
import { detectCoasts } from "./detectCoasts";
import { generateBaseTiles, seaLevelThreshold } from "./generateBaseTiles";
import { generateLakes } from "./generateLakes";
import { generateRegions } from "./generateRegions";
import { generateResources } from "./generateResources";
import { generateRivers } from "./generateRivers";
import { computeDeterministicHash } from "./hashArtifact";
import { createSeededRng } from "./rng";
import { validateArtifact } from "./validateArtifact";
import { validateMapSettings } from "./validateMapSettings";

export const generatorVersion = "asura-mapgen.0.2.0";

export function generateMap(input: Partial<MapGenerationSettings> = {}): GeneratedMapArtifact {
  const settings = validateMapSettings(mergeSettings(input));
  const rng = createSeededRng(`${settings.seed}:${generatorVersion}`);
  const layout = { orientation: "flatTop" as const, hexSize: 1, origin: { x: 0, z: 0 } };
  const coords = createCoordinateSet(settings);
  const topology = buildTopology(coords);
  const seaThreshold = seaLevelThreshold(settings);
  const tiles = generateBaseTiles(coords, settings, rng, seaThreshold);

  generateLakes(tiles, settings);
  detectCoasts(tiles, topology.neighborsByTileId);
  const regions = generateRegions(tiles, settings);
  const rivers = generateRivers(tiles, topology.edgesByTileId, settings);
  generateResources(tiles, settings);
  annotateTopologyEdges(topology.edgesByTileId, tiles);
  const borders = buildBorders(topology.edgesByTileId, layout, settings.seed);
  const bounds = buildBounds(tiles, layout);

  const artifact: GeneratedMapArtifact = {
    schemaVersion: "map-artifact.v1",
    generatorVersion,
    id: `map_${nanoid(10)}`,
    seed: settings.seed,
    deterministicHash: "",
    metadata: {
      createdAt: new Date().toISOString(),
      storageRevision: 1
    },
    settings,
    layout,
    bounds,
    tiles,
    topology,
    regions,
    rivers,
    borders,
    renderHints: buildRenderHints(seaThreshold)
  };

  artifact.deterministicHash = computeDeterministicHash(artifact);
  validateArtifact(artifact);
  return artifact;
}

function mergeSettings(input: Partial<MapGenerationSettings>): MapGenerationSettings {
  return {
    ...defaultMapSettings,
    ...input,
    landmass: { ...defaultMapSettings.landmass, ...input.landmass },
    rivers: { ...defaultMapSettings.rivers, ...input.rivers },
    lakes: { ...defaultMapSettings.lakes, ...input.lakes },
    resources: { ...defaultMapSettings.resources, ...input.resources },
    regions: { ...defaultMapSettings.regions, ...input.regions },
    debug: input.debug
  };
}
