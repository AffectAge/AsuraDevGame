import type { Axial, MapGenerationSettings } from "../../../../shared/src/map";
import { tileId } from "../../../../shared/src/map";
import { octaveNoise } from "./rng";

export type NoiseFields = {
  q: number;
  r: number;
  nx: number;
  ny: number;
  edgeFalloff: number;
  elevationNoise: number;
  ridgeNoise: number;
  moistureNoise: number;
  latitude: number;
};

export function generateNoiseFields(coords: Axial[], settings: MapGenerationSettings): Map<string, NoiseFields> {
  const fields = new Map<string, NoiseFields>();
  const centerQ = (settings.width - 1) / 2;
  const centerR = (settings.height - 1) / 2;

  for (const { q, r } of coords) {
    const nx = q / settings.width;
    const ny = r / settings.height;
    fields.set(tileId(q, r), {
      q,
      r,
      nx,
      ny,
      edgeFalloff: Math.max(Math.abs((q - centerQ) / centerQ), Math.abs((r - centerR) / centerR)),
      elevationNoise: octaveNoise(`${settings.seed}:elevation`, nx * 4, ny * 4, 5),
      ridgeNoise: Math.abs(octaveNoise(`${settings.seed}:ridge`, nx * 10, ny * 10, 3) - 0.5) * 2,
      moistureNoise: octaveNoise(`${settings.seed}:moisture`, nx * 5 + 13, ny * 5 - 7, 4),
      latitude: Math.abs(ny - 0.5) * 2
    });
  }

  return fields;
}
