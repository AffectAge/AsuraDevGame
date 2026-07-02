import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GeneratedMapArtifact } from "../../../../shared/src/map";
import { validateArtifact } from "../generation/validateArtifact";

export type MapArtifactStore = {
  save(artifact: GeneratedMapArtifact): Promise<void>;
  load(mapId: string): Promise<GeneratedMapArtifact>;
};

export class FileMapArtifactStore implements MapArtifactStore {
  constructor(private readonly artifactDir = path.resolve(process.cwd(), "data", "maps")) {}

  async save(artifact: GeneratedMapArtifact): Promise<void> {
    validateArtifact(artifact);
    await mkdir(this.artifactDir, { recursive: true });
    await writeFile(this.artifactPath(artifact.id), JSON.stringify(artifact), "utf8");
  }

  async load(mapId: string): Promise<GeneratedMapArtifact> {
    const content = await readFile(this.artifactPath(mapId), "utf8");
    const artifact = JSON.parse(content) as GeneratedMapArtifact;
    validateArtifact(artifact);
    return artifact;
  }

  private artifactPath(mapId: string): string {
    return path.join(this.artifactDir, `${mapId}.json`);
  }
}

export const mapArtifactStore: MapArtifactStore = new FileMapArtifactStore();

export async function saveMapArtifact(artifact: GeneratedMapArtifact): Promise<void> {
  await mapArtifactStore.save(artifact);
}

export async function loadMapArtifact(mapId: string): Promise<GeneratedMapArtifact> {
  return mapArtifactStore.load(mapId);
}
