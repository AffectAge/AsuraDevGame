import { Color3, Matrix, Mesh, MeshBuilder, Quaternion, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";
import type { GeneratedMapArtifact, MapTile } from "../../../../shared/src/map";
import { hexToWorld } from "../../../../shared/src/map";
import { createPropMaterial } from "../shaders";

type PropKind = "forest" | "rock" | "resource";

export function createPropLayer(scene: Scene, artifact: GeneratedMapArtifact): Mesh[] {
  const forestMatrices: Matrix[] = [];
  const rockMatrices: Matrix[] = [];
  const resourceMatrices: Matrix[] = [];

  for (const tile of artifact.tiles) {
    if (tile.isWater) continue;
    if (tile.vegetation !== "none") {
      forestMatrices.push(propMatrix(tile, artifact, "forest"));
    }
    if (tile.elevationClass === "hills" || tile.elevationClass === "mountains") {
      rockMatrices.push(propMatrix(tile, artifact, "rock"));
    }
    if (tile.resources && tile.resources.length > 0) {
      resourceMatrices.push(propMatrix(tile, artifact, "resource"));
    }
  }

  return [
    createThinInstanceProp(scene, "forest-props", "forest", forestMatrices, new Color3(0.14, 0.36, 0.18)),
    createThinInstanceProp(scene, "rock-props", "rock", rockMatrices, new Color3(0.36, 0.34, 0.32)),
    createThinInstanceProp(scene, "resource-props", "resource", resourceMatrices, new Color3(0.95, 0.78, 0.28))
  ].filter((mesh): mesh is Mesh => mesh !== null);
}

function createThinInstanceProp(scene: Scene, name: string, kind: PropKind, matrices: Matrix[], color: Color3): Mesh | null {
  if (matrices.length === 0) return null;

  const mesh =
    kind === "forest"
      ? MeshBuilder.CreateCylinder(name, { height: 0.42, diameterTop: 0, diameterBottom: 0.32, tessellation: 5 }, scene)
      : kind === "rock"
        ? MeshBuilder.CreatePolyhedron(name, { type: 2, size: 0.24 }, scene)
        : MeshBuilder.CreateBox(name, { size: 0.22 }, scene);

  mesh.material = createPropMaterial(scene, name, color);
  mesh.isPickable = false;
  mesh.thinInstanceSetBuffer("matrix", new Float32Array(matrices.flatMap((matrix) => Array.from(matrix.asArray()))), 16, true);
  return mesh;
}

function propMatrix(tile: MapTile, artifact: GeneratedMapArtifact, kind: PropKind): Matrix {
  const center = hexToWorld(tile.q, tile.r, artifact.layout);
  const offset = propOffset(tile, artifact.layout.hexSize, kind);
  const scale = kind === "forest" ? 1 + tile.visual.terrainVariant * 0.08 : kind === "rock" ? 0.9 : 1;
  const y = tile.elevation * artifact.renderHints.heightScale + (kind === "forest" ? 0.24 : kind === "resource" ? 0.18 : 0.12);
  return Matrix.Compose(
    new Vector3(scale, scale, scale),
    Quaternion.Identity(),
    new Vector3(center.x + offset.x, y, center.z + offset.z)
  );
}

function propOffset(tile: MapTile, hexSize: number, kind: PropKind): { x: number; z: number } {
  const hash = ((tile.q * 73856093) ^ (tile.r * 19349663) ^ kind.length) >>> 0;
  const angle = (hash % 360) * (Math.PI / 180);
  const radius = hexSize * (kind === "resource" ? 0.18 : 0.24);
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius
  };
}
