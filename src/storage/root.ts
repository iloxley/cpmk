import path from 'node:path';
import { ioError, pathUnsafe, projectNotFound } from '../domain/errors.js';
import { configPath, cpmkDir, isInsideRoot } from './paths.js';
import { nodeFs, pathExists, type FsOps } from './fs-ops.js';

export async function resolveExistingDirectory(
  start: string,
  ops: FsOps = nodeFs,
): Promise<string> {
  try {
    const absolute = path.resolve(start);
    const real = await ops.realpath(absolute);
    const info = await ops.stat(real);
    if (!info.isDirectory()) {
      throw ioError('root path is not a directory', absolute);
    }
    return real;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw ioError('root path does not exist', path.resolve(start), error);
    }
    throw error;
  }
}

export async function safeResolve(
  root: string,
  candidate: string,
  ops: FsOps = nodeFs,
): Promise<string> {
  const realRoot = await ops.realpath(root);
  const absolute = path.resolve(candidate);
  const missing: string[] = [];
  let current = absolute;

  for (;;) {
    try {
      const real = await ops.realpath(current);
      if (!isInsideRoot(realRoot, real)) {
        throw pathUnsafe('symlink or path escapes the project root', absolute);
      }
      let resolved = real;
      for (const part of [...missing].reverse()) {
        resolved = path.join(resolved, part);
      }
      if (!isInsideRoot(realRoot, resolved)) {
        throw pathUnsafe('path escapes the project root', absolute);
      }
      return resolved;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        const parent = path.dirname(current);
        if (parent === current) {
          throw pathUnsafe('path cannot be resolved', absolute);
        }
        missing.push(path.basename(current));
        current = parent;
        continue;
      }
      throw error;
    }
  }
}

export async function assertSafeProjectLayout(
  root: string,
  ops: FsOps = nodeFs,
): Promise<void> {
  const realRoot = await ops.realpath(root);
  const projectDir = cpmkDir(realRoot);
  if (!(await pathExists(ops, projectDir))) {
    return;
  }
  const realCpmk = await ops.realpath(projectDir);
  if (!isInsideRoot(realRoot, realCpmk)) {
    throw pathUnsafe('.cpmk escapes the project root', projectDir);
  }
  const config = configPath(realRoot);
  if (await pathExists(ops, config)) {
    const realConfig = await ops.realpath(config);
    if (!isInsideRoot(realCpmk, realConfig)) {
      throw pathUnsafe('config.json escapes the project root', config);
    }
  }
}

export async function discoverRoot(
  start: string,
  ops: FsOps = nodeFs,
): Promise<string> {
  let current = path.resolve(start);
  for (;;) {
    const config = configPath(current);
    if (await pathExists(ops, config)) {
      await assertSafeProjectLayout(current, ops);
      return ops.realpath(current);
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw projectNotFound(path.resolve(start));
    }
    current = parent;
  }
}

export async function resolveProjectRoot(
  start: string,
  ops: FsOps = nodeFs,
): Promise<string> {
  const existing = await resolveExistingDirectory(start, ops);
  return discoverRoot(existing, ops);
}
