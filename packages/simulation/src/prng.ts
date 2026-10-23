/**
 * Deterministic pseudo-random generator (mulberry32 over a 32-bit state derived from a string seed).
 * Pure and platform independent: no Math.random, no clock, no node:* imports.
 */
export interface Prng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [0, bound). */
  nextInt(bound: number): number;
}

/** FNV-1a 32-bit hash of the seed string, used to derive the initial state. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function createPrng(seed: string): Prng {
  let state = hashSeed(seed);
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    nextInt(bound: number): number {
      if (!Number.isInteger(bound) || bound <= 0) {
        throw new RangeError('bound must be a positive integer.');
      }
      return Math.floor(next() * bound);
    },
  };
}
