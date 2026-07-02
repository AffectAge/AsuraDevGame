import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("client rendering architecture", () => {
  it("renders props with thin instances instead of one mesh per tile", async () => {
    const source = await readFile("client/src/map/render/PropLayer.ts", "utf8");
    expect(source).toContain("thinInstanceSetBuffer");
    expect(source).toMatch(/for \(const tile of artifact\.tiles\)/);
    const loopBody = source.split("for (const tile of artifact.tiles)")[1]?.split("return [")[0] ?? "";
    expect(loopBody).not.toMatch(/MeshBuilder\.Create/);
  });

  it("renders river segments as one batched strip mesh", async () => {
    const source = await readFile("client/src/map/render/RiverMeshLayer.ts", "utf8");
    expect(source).toContain('new Mesh("river-layer"');
    expect(source).toContain("VertexData");
    expect(source).not.toMatch(/MeshBuilder\.CreateTube/);
  });

  it("keeps map scene composition split into dedicated camera lighting picking modules", async () => {
    const source = await readFile("client/src/map/scene/createMapScene.ts", "utf8");
    expect(source).toContain("createMapCamera");
    expect(source).toContain("createLighting");
    expect(source).toContain("MapInputController");
    expect(source).toContain("CameraController");
  });

  it("keeps pointer and camera interaction in dedicated controllers", async () => {
    const inputSource = await readFile("client/src/map/interaction/MapInputController.ts", "utf8");
    const cameraSource = await readFile("client/src/map/interaction/CameraController.ts", "utf8");
    expect(inputSource).toContain("pickHexFromPointer");
    expect(inputSource).toContain("findRoute");
    expect(cameraSource).toContain("keydown");
    expect(cameraSource).toContain("wheel");
    expect(cameraSource).toContain("orthoTop");
    expect(cameraSource).toContain("edgePanInput");
    expect(cameraSource).toContain("panByScreenPixels");
    expect(cameraSource).toContain("rotateByScreenPixels");
    expect(cameraSource).toContain("resetRotation");
    expect(cameraSource).toContain("NumpadAdd");
    expect(cameraSource).toContain("NumpadSubtract");
    expect(cameraSource).toContain('(this.isPressed("w") || this.isPressed("arrowup") ? 1 : 0)');
    expect(cameraSource).toContain("this.pointerY <= margin ? 1");
    expect(cameraSource).toContain('key === "t"');
    expect(cameraSource).toContain('key === "r"');
    const cameraFactory = await readFile("client/src/map/scene/createMapCamera.ts", "utf8");
    expect(cameraFactory).not.toContain("attachControl");
  });

  it("keeps primary render materials in shader/material factory modules", async () => {
    const renderFiles = [
      "client/src/map/render/TerrainMeshLayer.ts",
      "client/src/map/render/WaterMeshLayer.ts",
      "client/src/map/render/RegionOverlayLayer.ts",
      "client/src/map/render/RiverMeshLayer.ts",
      "client/src/map/render/PropLayer.ts"
    ];

    for (const file of renderFiles) {
      const source = await readFile(file, "utf8");
      expect(source).not.toMatch(/new StandardMaterial/);
      expect(source).toMatch(/from "\.\.\/shaders"/);
    }
  });

  it("splits Babylon engine code into a dedicated Vite chunk", async () => {
    const source = await readFile("vite.config.ts", "utf8");
    expect(source).toContain("manualChunks");
    expect(source).toContain("node_modules/@babylonjs");
    expect(source).toContain("babylon");
  });
});
