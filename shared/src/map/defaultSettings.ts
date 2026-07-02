import type { MapGenerationSettings } from "./artifactTypes";

export const defaultMapSettings: MapGenerationSettings = {
  seed: "asura-default-map",
  width: 192,
  height: 128,
  shape: "rectangle",
  orientation: "flatTop",
  wraparound: false,
  worldAge: "normal",
  temperature: "temperate",
  rainfall: "normal",
  seaLevel: "normal",
  landmass: {
    mode: "continents",
    continentCount: 3
  },
  rivers: {
    enabled: true,
    density: 0.6
  },
  lakes: {
    enabled: true,
    density: 0.15
  },
  resources: {
    enabled: true,
    strategicDensity: 0.5,
    luxuryDensity: 0.5,
    bonusDensity: 0.8
  },
  regions: {
    generateContinents: true,
    generateSeas: true,
    generateClimateRegions: true,
    generateProvinceRegions: false
  }
};
