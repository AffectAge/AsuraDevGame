import type { HexGridArtifact, HexMapSettings } from "../../../../shared/src";

export async function generateAndLoadMap(settings?: Partial<HexMapSettings>): Promise<HexGridArtifact> {
  const response = await fetch("/api/maps/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settings ?? {})
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as HexGridArtifact;
}
