import path from 'node:path';
import { createDefaultConfig } from '../domain/config.js';
import { alreadyInitialized, validationError } from '../domain/errors.js';
import { validateConfigValue } from '../domain/validate.js';
import { writeAtomicFile, serializeJson } from '../storage/atomic.js';
import { nodeFs, pathExists, type FsOps } from '../storage/fs-ops.js';
import {
  cpmkDir,
  configPath,
  generatedDir,
  memoryDir,
} from '../storage/paths.js';
import { resolveExistingDirectory } from '../storage/root.js';

export interface InitResult {
  root: string;
  cpmkDir: string;
}

export async function initProject(options: {
  root: string;
  name?: string;
  fs?: FsOps;
}): Promise<InitResult> {
  const ops = options.fs ?? nodeFs;
  const root = await resolveExistingDirectory(options.root, ops);
  const projectDir = cpmkDir(root);
  if (await pathExists(ops, projectDir)) {
    throw alreadyInitialized(projectDir);
  }

  const name = (options.name ?? path.basename(root)).trim();
  if (name.length === 0) {
    throw validationError('project name must be a non-empty string');
  }
  const config = validateConfigValue(
    createDefaultConfig(name),
    configPath(root),
  );

  await ops.mkdir(projectDir);
  try {
    await writeAtomicFile(configPath(root), serializeJson(config), ops);
    await ops.mkdir(memoryDir(root));
    await ops.writeFile(path.join(memoryDir(root), '.gitkeep'), '');
    await ops.mkdir(generatedDir(root));
    await ops.writeFile(path.join(generatedDir(root), '.gitkeep'), '');
  } catch (error) {
    await ops.rm(projectDir, { recursive: true, force: true });
    throw error;
  }

  return { root, cpmkDir: projectDir };
}
