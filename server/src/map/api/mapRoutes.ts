import { Router } from "express";
import { defaultMapSettings } from "../../../../shared/src/map";
import { generateMap } from "../generation/generateMap";
import { mapArtifactStore } from "../storage/mapArtifactStore";

export const mapRoutes = Router();

mapRoutes.post("/maps/generate", async (req, res, next) => {
  try {
    const artifact = generateMap({ ...defaultMapSettings, ...req.body });
    await mapArtifactStore.save(artifact);
    res.json({
      mapId: artifact.id,
      artifactUrl: `/api/maps/${artifact.id}`
    });
  } catch (error) {
    next(error);
  }
});

mapRoutes.get("/maps/:mapId", async (req, res, next) => {
  try {
    const artifact = await mapArtifactStore.load(req.params.mapId);
    res.json(artifact);
  } catch (error) {
    next(error);
  }
});

mapRoutes.get("/maps/dev/default", async (_req, res, next) => {
  try {
    const artifact = generateMap(defaultMapSettings);
    await mapArtifactStore.save(artifact);
    res.json(artifact);
  } catch (error) {
    next(error);
  }
});
