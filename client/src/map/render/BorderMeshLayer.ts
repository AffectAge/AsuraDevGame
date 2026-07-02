import { Color3, MeshBuilder, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { BorderSegment, GeneratedMapArtifact } from "../../../../shared/src/map";

export function createBorderMeshLayer(scene: Scene, artifact: GeneratedMapArtifact): void {
  createLineSystem(scene, artifact, "coast", new Color3(0.93, 0.88, 0.62), 0.03);
  createLineSystem(scene, artifact, "region", new Color3(0.15, 0.18, 0.2), 0.02);
  createLineSystem(scene, artifact, "mapEdge", new Color3(0.05, 0.06, 0.07), 0.025);
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
