import { z } from "zod";
import type { MapGenerationSettings } from "../../../../shared/src/map";

const settingsSchema = z.object({
  seed: z.string().min(1),
  width: z.number().int().min(8).max(256),
  height: z.number().int().min(8).max(256),
  shape: z.literal("rectangle"),
  orientation: z.literal("flatTop"),
  wraparound: z.literal(false),
  worldAge: z.enum(["young", "normal", "old"]),
  temperature: z.enum(["cold", "temperate", "hot"]),
  rainfall: z.enum(["dry", "normal", "wet"]),
  seaLevel: z.enum(["low", "normal", "high"]),
  landmass: z.object({
    mode: z.enum(["continents", "pangaea", "archipelago", "islands"]),
    continentCount: z.number().int().min(1).max(12).optional(),
    islandDensity: z.number().min(0).max(1).optional()
  }),
  rivers: z.object({
    enabled: z.boolean(),
    density: z.number().min(0).max(1)
  }),
  lakes: z.object({
    enabled: z.boolean(),
    density: z.number().min(0).max(1)
  }),
  resources: z.object({
    enabled: z.boolean(),
    strategicDensity: z.number().min(0).max(1),
    luxuryDensity: z.number().min(0).max(1),
    bonusDensity: z.number().min(0).max(1)
  }),
  regions: z.object({
    generateContinents: z.boolean(),
    generateSeas: z.boolean(),
    generateClimateRegions: z.boolean(),
    generateProvinceRegions: z.boolean()
  }),
  debug: z
    .object({
      includeNoiseFields: z.boolean().optional(),
      includeGenerationLayers: z.boolean().optional()
    })
    .optional()
});

export function validateMapSettings(input: unknown): MapGenerationSettings {
  return settingsSchema.parse(input);
}
