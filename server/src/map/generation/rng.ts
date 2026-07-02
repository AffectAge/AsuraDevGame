export type Rng = {
  next(): number;
  int(maxExclusive: number): number;
  range(min: number, max: number): number;
};

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRng(seed: string): Rng {
  let state = hashString(seed) || 1;
  return {
    next() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(maxExclusive: number) {
      return Math.floor(this.next() * maxExclusive);
    },
    range(min: number, max: number) {
      return min + (max - min) * this.next();
    }
  };
}

export function valueNoise2d(seed: string, x: number, y: number): number {
  const h = hashString(`${seed}:${Math.floor(x)}:${Math.floor(y)}`);
  return h / 4294967295;
}

export function smoothNoise2d(seed: string, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = valueNoise2d(seed, ix, iy);
  const b = valueNoise2d(seed, ix + 1, iy);
  const c = valueNoise2d(seed, ix, iy + 1);
  const d = valueNoise2d(seed, ix + 1, iy + 1);
  const x1 = a + (b - a) * sx;
  const x2 = c + (d - c) * sx;
  return x1 + (x2 - x1) * sy;
}

export function octaveNoise(seed: string, x: number, y: number, octaves = 4): number {
  let amplitude = 1;
  let frequency = 1;
  let value = 0;
  let total = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += smoothNoise2d(`${seed}:${i}`, x * frequency, y * frequency) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / total;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
