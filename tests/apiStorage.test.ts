import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/src/app";
import { loadMapArtifact } from "../server/src/map";
import { FileMapArtifactStore } from "../server/src/map/storage/mapArtifactStore";
import { defaultMapSettings } from "../shared/src/map";
import { generateMap } from "../server/src/map";

describe("map API and storage", () => {
  it("generates, saves, and loads a map artifact through the public API contract", async () => {
    const app = createApp();
    const generateResponse = await request(app)
      .post("/api/maps/generate")
      .send({ ...defaultMapSettings, seed: "api-storage-test", width: 18, height: 12 })
      .expect(200);

    expect(generateResponse.body.mapId).toMatch(/^map_/);
    expect(generateResponse.body.artifactUrl).toBe(`/api/maps/${generateResponse.body.mapId}`);

    const artifactResponse = await request(app).get(generateResponse.body.artifactUrl).expect(200);
    expect(artifactResponse.body.schemaVersion).toBe("map-artifact.v1");
    expect(artifactResponse.body.deterministicHash).toMatch(/^[a-f0-9]{64}$/);
    expect(artifactResponse.body.tiles).toHaveLength(216);

    const stored = await loadMapArtifact(generateResponse.body.mapId);
    expect(stored.id).toBe(generateResponse.body.mapId);
    expect(stored.tiles).toHaveLength(216);
  });

  it("rejects invalid generation settings", async () => {
    const app = createApp();
    await request(app)
      .post("/api/maps/generate")
      .send({ ...defaultMapSettings, width: 2 })
      .expect(400);
  });

  it("supports a replaceable file artifact store backend", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "asura-map-store-"));
    const store = new FileMapArtifactStore(dir);
    const artifact = generateMap({ ...defaultMapSettings, seed: "store-interface-test", width: 12, height: 10 });

    await store.save(artifact);
    const loaded = await store.load(artifact.id);
    expect(loaded.deterministicHash).toBe(artifact.deterministicHash);
    expect(loaded.tiles).toHaveLength(120);

    await writeFile(path.join(dir, `${artifact.id}.json`), JSON.stringify({ ...artifact, deterministicHash: "0".repeat(64) }), "utf8");
    await expect(store.load(artifact.id)).rejects.toThrow(/deterministicHash/);
  });
});
