import { ArcRotateCamera, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact } from "../../../../shared/src/map";

export function createMapCamera(scene: Scene, canvas: HTMLCanvasElement, artifact: GeneratedMapArtifact): ArcRotateCamera {
  const center = new Vector3(
    (artifact.bounds.worldMinX + artifact.bounds.worldMaxX) / 2,
    0,
    (artifact.bounds.worldMinZ + artifact.bounds.worldMaxZ) / 2
  );
  const mapSpan = Math.max(artifact.bounds.worldMaxX - artifact.bounds.worldMinX, artifact.bounds.worldMaxZ - artifact.bounds.worldMinZ);
  const camera = new ArcRotateCamera("map-camera", -Math.PI / 2, Math.PI / 3, mapSpan * 0.75, center, scene);
  const orthoHeight = Math.min(72, Math.max(18, mapSpan * 0.42));
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);

  camera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
  camera.orthoTop = orthoHeight / 2;
  camera.orthoBottom = -orthoHeight / 2;
  camera.orthoLeft = (-orthoHeight * aspect) / 2;
  camera.orthoRight = (orthoHeight * aspect) / 2;
  camera.lowerBetaLimit = Math.PI / 4;
  camera.upperBetaLimit = Math.PI / 2.35;
  camera.lowerRadiusLimit = camera.radius;
  camera.upperRadiusLimit = camera.radius;
  camera.panningSensibility = 28;
  camera.wheelPrecision = 18;

  return camera;
}

export function clampCameraToMap(camera: ArcRotateCamera, artifact: GeneratedMapArtifact): void {
  const target = camera.target;
  target.x = Math.max(artifact.bounds.worldMinX, Math.min(artifact.bounds.worldMaxX, target.x));
  target.z = Math.max(artifact.bounds.worldMinZ, Math.min(artifact.bounds.worldMaxZ, target.z));
}
