import { Color3, Effect, ShaderMaterial, Texture, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

const SHADER_NAME = "ancestorsTerrainTexture";
const TERRAIN_ATLAS_COLUMN_COUNT = 5;

Effect.ShadersStore[`${SHADER_NAME}VertexShader`] = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec3 terrainIndices;

uniform mat4 world;
uniform mat4 worldViewProjection;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vWeights;
varying vec3 vTerrainIndices;

void main(void) {
  vec4 worldPosition = world * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(mat3(world) * normal);
  vWeights = max(color.rgb, vec3(0.0));
  vTerrainIndices = terrainIndices;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

Effect.ShadersStore[`${SHADER_NAME}FragmentShader`] = `
precision highp float;

uniform sampler2D terrainAtlas;
uniform float terrainAtlasColumns;
uniform float terrainTiling;
uniform vec3 lightDirection;
uniform vec3 ambientColor;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vWeights;
varying vec3 vTerrainIndices;

vec4 sampleTerrain(float terrainIndex) {
  vec2 uv = fract(vWorldPosition.xz * terrainTiling);
  uv.y = 1.0 - uv.y;
  float column = clamp(floor(terrainIndex + 0.5), 0.0, terrainAtlasColumns - 1.0);
  vec2 atlasUv = vec2((column + uv.x) / terrainAtlasColumns, uv.y);
  return texture2D(terrainAtlas, atlasUv);
}

void main(void) {
  vec3 weights = max(vWeights, vec3(0.0));
  float weightTotal = max(weights.x + weights.y + weights.z, 0.0001);
  weights /= weightTotal;

  vec4 terrain =
    sampleTerrain(vTerrainIndices.x) * weights.x +
    sampleTerrain(vTerrainIndices.y) * weights.y +
    sampleTerrain(vTerrainIndices.z) * weights.z;

  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, normalize(-lightDirection)), 0.0);
  vec3 lighting = ambientColor + vec3(diffuse * 0.72);
  gl_FragColor = vec4(terrain.rgb * lighting, terrain.a);
}
`;

export function createTerrainMaterial(scene: Scene): ShaderMaterial {
  const material = new ShaderMaterial(
    "hex-terrain-texture-material",
    scene,
    {
      vertex: SHADER_NAME,
      fragment: SHADER_NAME
    },
    {
      attributes: ["position", "normal", "color", "terrainIndices"],
      uniforms: ["world", "worldViewProjection", "terrainAtlasColumns", "terrainTiling", "lightDirection", "ambientColor"],
      samplers: ["terrainAtlas"]
    }
  );

  const texture = new Texture("/assets/terrain-texture-array.png", scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;

  material.setTexture("terrainAtlas", texture);
  material.setFloat("terrainAtlasColumns", TERRAIN_ATLAS_COLUMN_COUNT);
  material.setFloat("terrainTiling", 0.055);
  material.setVector3("lightDirection", new Vector3(-0.45, -1, -0.35));
  material.setColor3("ambientColor", new Color3(0.58, 0.58, 0.58));
  material.backFaceCulling = false;

  return material;
}
