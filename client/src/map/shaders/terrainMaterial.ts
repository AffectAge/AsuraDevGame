import { Effect, ShaderMaterial } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene";

Effect.ShadersStore.terrainBarycentricVertexShader = `
precision highp float;

attribute vec3 position;
attribute vec3 a_barycentric;
attribute vec4 blendColorA;
attribute vec4 blendColorB;
attribute vec4 blendColorC;
attribute vec4 blendCenter;
attribute float blendNoise;

uniform mat4 worldViewProjection;

varying vec3 vBarycentric;
varying vec4 vBlendColorA;
varying vec4 vBlendColorB;
varying vec4 vBlendColorC;
varying vec4 vBlendCenter;
varying float vBlendNoise;
varying vec3 vWorldPosition;

void main(void) {
  vec4 worldPosition = vec4(position, 1.0);
  vBarycentric = a_barycentric;
  vBlendColorA = blendColorA;
  vBlendColorB = blendColorB;
  vBlendColorC = blendColorC;
  vBlendCenter = blendCenter;
  vBlendNoise = blendNoise;
  vWorldPosition = position;
  gl_Position = worldViewProjection * worldPosition;
}
`;

Effect.ShadersStore.terrainBarycentricFragmentShader = `
precision highp float;

uniform float transitionSoftness;
uniform float noiseStrength;
uniform float biomeContrast;

varying vec3 vBarycentric;
varying vec4 vBlendColorA;
varying vec4 vBlendColorB;
varying vec4 vBlendColorC;
varying vec4 vBlendCenter;
varying float vBlendNoise;
varying vec3 vWorldPosition;

float hashNoise(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

float smoothValueNoise(vec2 value) {
  vec2 cell = floor(value);
  vec2 local = fract(value);
  vec2 smoothLocal = local * local * (3.0 - 2.0 * local);
  float a = hashNoise(cell);
  float b = hashNoise(cell + vec2(1.0, 0.0));
  float c = hashNoise(cell + vec2(0.0, 1.0));
  float d = hashNoise(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, smoothLocal.x), mix(c, d, smoothLocal.x), smoothLocal.y);
}

vec3 contrast(vec3 color, float amount) {
  return clamp((color - 0.5) * amount + 0.5, 0.0, 1.0);
}

void main(void) {
  float noise = smoothValueNoise(vWorldPosition.xz * 1.35 + vec2(vBlendNoise * 0.17, vBlendNoise * 0.11));
  vec3 biased = max(vBarycentric, vec3(0.0));
  biased = pow(biased, vec3(max(0.001, transitionSoftness)));
  biased /= max(0.0001, biased.x + biased.y + biased.z);

  vec4 cornerBlend = vBlendColorA * biased.x + vBlendColorB * biased.y + vBlendColorC * biased.z;
  float distanceFromCenter = clamp(1.0 - biased.x, 0.0, 1.0);
  float neighborInfluence = clamp(distanceFromCenter * (0.32 + (noise - 0.5) * noiseStrength), 0.0, 0.42);
  vec4 color = mix(vBlendCenter, cornerBlend, neighborInfluence);
  gl_FragColor = vec4(contrast(color.rgb, biomeContrast), color.a);
}
`;

export function createTerrainMaterial(scene: Scene): ShaderMaterial {
  const material = new ShaderMaterial(
    "terrain-material",
    scene,
    {
      vertex: "terrainBarycentric",
      fragment: "terrainBarycentric"
    },
    {
      attributes: ["position", "a_barycentric", "blendColorA", "blendColorB", "blendColorC", "blendCenter", "blendNoise"],
      uniforms: ["worldViewProjection", "transitionSoftness", "noiseStrength", "biomeContrast"]
    }
  );

  material.setFloat("transitionSoftness", 0.9);
  material.setFloat("noiseStrength", 0.12);
  material.setFloat("biomeContrast", 1.04);
  return material;
}
