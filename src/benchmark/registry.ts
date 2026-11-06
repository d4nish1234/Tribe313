import type { BenchmarkVersion } from './types';
import { v1 } from './versions/v1';

/**
 * Every benchmark version this build knows about. Never remove or edit an
 * entry once it has shipped: saved benchmarks keep using their own version.
 * To change the tests, add versions/vN and bump LATEST_VERSION.
 */
export const VERSIONS: Record<number, BenchmarkVersion> = {
  1: v1,
};

export const LATEST_VERSION = 1;

export function getVersion(n: number | undefined | null): BenchmarkVersion | null {
  if (typeof n !== 'number') return null;
  return VERSIONS[n] ?? null;
}

export function latestVersion(): BenchmarkVersion {
  return VERSIONS[LATEST_VERSION];
}
