import { Color3, MeshBuilder, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { BorderSegment, GeneratedMapArtifact } from "../../../../shared/src/map";

export function createBorderMeshLayer(scene: Scene, artifact: GeneratedMapArtifact): void {
  createLineSystem(scene, artifact, "coast", new Color3(0.78, 0.72, 0.46), 0.026);
  createLineSystem(scene, artifact, "region", new Color3(0.34, 0.42, 0.31), 0.018);
  createLineSystem(scene, artifact, "mapEdge", new Color3(0.28, 0.32, 0.26), 0.02);
  createLineSystem(scene, artifact, "river", new Color3(0.2, 0.55, 0.86), 0.025);
}

function createLineSystem(scene: Scene, artifact: GeneratedMapArtifact, type: BorderSegment["type"], color: Color3, yOffset: number): void {
  const lines = artifact.borders
    .filter((border) => border.type === type)
    .map((border) => border.polyline.map((point) => new Vector3(point.x, artifact.renderHints.waterLevel + yOffset, point.z)));
  if (lines.length === 0) return;
  const mesh = MeshBuilder.CreateLineSystem(`${type}-borders`, { lines, updatable: false }, scene);
  mesh.color = color;
  mesh.freezeWorldMatrix();
}
