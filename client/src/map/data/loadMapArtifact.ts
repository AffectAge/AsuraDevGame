import type { GeneratedMapArtifact, MapGenerationSettings } from "../../../../shared/src/map";
import { defaultMapSettings } from "../../../../shared/src/map";

export async function generateAndLoadMap(settings: MapGenerationSettings = defaultMapSettings): Promise<GeneratedMapArtifact> {
  const generateResponse = await fetch("/api/maps/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
  });

  if (!generateResponse.ok) {
    throw new Error(await generateResponse.text());
  }

  const result = (await generateResponse.json()) as { mapId: string; artifactUrl: string };
  const artifactResponse = await fetch(result.artifactUrl);
  if (!artifactResponse.ok) {
    throw new Error(await artifactResponse.text());
  }

  return (await artifactResponse.json()) as GeneratedMapArtifact;
}
