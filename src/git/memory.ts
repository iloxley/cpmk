import { spawnSync } from 'node:child_process';
import { validationError } from '../domain/errors.js';
import { parseEntry } from '../domain/validate.js';
import type { MemoryEntry } from '../domain/types.js';

function git(
  cwd: string,
  args: readonly string[],
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function readMemoryAtRef(
  projectRoot: string,
  ref: string,
): MemoryEntry[] {
  const top = git(projectRoot, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) {
    throw validationError('not a Git repository; cannot sync from a ref');
  }
  const root = top.stdout.trim();
  const verify = git(root, ['rev-parse', '--verify', ref]);
  if (verify.status !== 0) {
    throw validationError(`Git ref ${ref} was not found`);
  }
  const tree = git(root, [
    'ls-tree',
    '-r',
    '--name-only',
    ref,
    '--',
    '.cpmk/memory',
  ]);
  if (tree.status !== 0) {
    throw validationError(`could not list .cpmk/memory at ${ref}`);
  }
  const entries: MemoryEntry[] = [];
  for (const relative of tree.stdout.split('\n').filter(Boolean).sort()) {
    if (!relative.endsWith('.json')) {
      continue;
    }
    const shown = git(root, ['show', `${ref}:${relative}`]);
    if (shown.status !== 0) {
      throw validationError(`could not read ${relative} at ${ref}`);
    }
    entries.push(parseEntry(shown.stdout, `${ref}:${relative}`));
  }
  return entries;
}
