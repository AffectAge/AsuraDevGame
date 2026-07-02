import compression from "compression";
import cors from "cors";
import express from "express";
import { mapRoutes } from "./map/routes";

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", mapRoutes);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  });

  return app;
}
