import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validationError } from '../domain/errors.js';

const MARKER = '# cpmk-hook v1';
const HOOK_NAMES = ['post-checkout', 'post-commit'] as const;

const HOOK_BODY = `#!/bin/sh
${MARKER}
echo "cpmk: consider cpmk handoff before leaving this branch" >&2
`;

function hooksDir(projectRoot: string): string {
  const result = spawnSync('git', ['rev-parse', '--git-path', 'hooks'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw validationError('not a Git repository; cannot install hooks');
  }
  const reported = result.stdout.trim();
  return path.isAbsolute(reported)
    ? reported
    : path.join(projectRoot, reported);
}

export async function installHooks(projectRoot: string): Promise<string[]> {
  const directory = hooksDir(projectRoot);
  await mkdir(directory, { recursive: true });
  const written: string[] = [];
  for (const name of HOOK_NAMES) {
    const target = path.join(directory, name);
    try {
      const existing = await readFile(target, 'utf8');
      if (!existing.includes(MARKER)) {
        throw validationError(
          `refusing to overwrite existing ${name} hook`,
          target,
        );
      }
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        // create
      } else {
        throw error;
      }
    }
    await writeFile(target, HOOK_BODY, 'utf8');
    await chmod(target, 0o755);
    written.push(target);
  }
  return written;
}

export async function uninstallHooks(projectRoot: string): Promise<string[]> {
  const directory = hooksDir(projectRoot);
  const removed: string[] = [];
  for (const name of HOOK_NAMES) {
    const target = path.join(directory, name);
    try {
      const existing = await readFile(target, 'utf8');
      if (!existing.includes(MARKER)) {
        continue;
      }
      await unlink(target);
      removed.push(target);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        continue;
      }
      throw error;
    }
  }
  return removed;
}
