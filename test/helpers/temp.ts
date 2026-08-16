import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export async function real(target: string): Promise<string> {
  return realpath(target);
}

export async function withTempDir<T>(
  run: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(path.join(tmpdir(), 'cpmk-test-'));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function fixedClock(iso = '2026-01-01T00:00:00.000Z') {
  return { now: () => new Date(iso) };
}

export function fixedIds(id = '01JEXAMPLE0000000000000000') {
  return { next: () => id };
}
