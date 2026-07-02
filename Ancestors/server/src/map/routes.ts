import { Router } from "express";
import { generateMap } from "./generateMap";

export const mapRoutes = Router();

mapRoutes.post("/maps/generate", (req, res, next) => {
  try {
    res.json(generateMap(req.body));
  } catch (error) {
    next(error);
  }
});

mapRoutes.get("/maps/dev/default", (_req, res, next) => {
  try {
    res.json(generateMap());
  } catch (error) {
    next(error);
  }
});
