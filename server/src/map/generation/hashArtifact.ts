import { createHash } from "node:crypto";
import type { DeterministicMapContent, GeneratedMapArtifact } from "../../../../shared/src/map";

export function getDeterministicMapContent(artifact: GeneratedMapArtifact): DeterministicMapContent {
  return {
    generatorVersion: artifact.generatorVersion,
    seed: artifact.seed,
    settings: artifact.settings,
    layout: artifact.layout,
    bounds: artifact.bounds,
    tiles: artifact.tiles,
    topology: artifact.topology,
    regions: artifact.regions,
    rivers: artifact.rivers,
    borders: artifact.borders,
    renderHints: artifact.renderHints
  };
}

export function hashArtifactContent(content: DeterministicMapContent): string {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function computeDeterministicHash(artifact: GeneratedMapArtifact): string {
  return hashArtifactContent(getDeterministicMapContent(artifact));
}
