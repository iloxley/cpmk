import path from 'node:path';
import { parsePluginManifest, type PluginManifest } from '../domain/plugin.js';
import { validationError } from '../domain/errors.js';
import { writeAtomicFile } from '../storage/atomic.js';
import { nodeFs, pathExists, type FsOps } from '../storage/fs-ops.js';
import { pluginsDir } from '../storage/paths.js';
import { safeResolve } from '../storage/root.js';

export interface ListedPlugin {
  name: string;
  version: string;
  valid: boolean;
}

async function readManifestAt(
  directory: string,
  name: string,
  ops: FsOps,
): Promise<PluginManifest> {
  const file = path.join(directory, 'plugin.json');
  const raw = await ops.readFile(file);
  return parsePluginManifest(raw, name, file);
}

export async function listPlugins(options: {
  projectRoot: string;
  fs?: FsOps;
}): Promise<ListedPlugin[]> {
  const ops = options.fs ?? nodeFs;
  const directory = pluginsDir(options.projectRoot);
  if (!(await pathExists(ops, directory))) {
    return [];
  }
  const names = (await ops.readdir(directory)).sort();
  const listed: ListedPlugin[] = [];
  for (const name of names) {
    const child = path.join(directory, name);
    const info = await ops.lstat(child);
    if (!info.isDirectory()) {
      continue;
    }
    try {
      const manifest = await readManifestAt(child, name, ops);
      listed.push({
        name: manifest.name,
        version: manifest.version,
        valid: true,
      });
    } catch {
      listed.push({ name, version: 'invalid', valid: false });
    }
  }
  return listed;
}

export async function loadValidPlugins(options: {
  projectRoot: string;
  fs?: FsOps;
}): Promise<PluginManifest[]> {
  const listed = await listPlugins(options);
  const ops = options.fs ?? nodeFs;
  const manifests: PluginManifest[] = [];
  for (const item of listed) {
    if (!item.valid) {
      continue;
    }
    manifests.push(
      await readManifestAt(
        path.join(pluginsDir(options.projectRoot), item.name),
        item.name,
        ops,
      ),
    );
  }
  return manifests;
}

export async function installPlugin(options: {
  projectRoot: string;
  sourcePath: string;
  fs?: FsOps;
}): Promise<PluginManifest> {
  const ops = options.fs ?? nodeFs;
  const source = path.resolve(options.sourcePath);
  const raw = await ops.readFile(path.join(source, 'plugin.json'));
  const preview = JSON.parse(raw) as { name?: unknown };
  if (typeof preview.name !== 'string') {
    throw validationError('plugin.json is missing name', source);
  }
  const manifest = parsePluginManifest(
    raw,
    preview.name,
    path.join(source, 'plugin.json'),
  );
  const targetDir = await safeResolve(
    options.projectRoot,
    path.join(pluginsDir(options.projectRoot), manifest.name),
    ops,
  );
  await ops.mkdir(targetDir, { recursive: true });
  const target = path.join(targetDir, 'plugin.json');
  await writeAtomicFile(target, `${raw.trim()}\n`, ops);
  return manifest;
}

export async function uninstallPlugin(options: {
  projectRoot: string;
  name: string;
  fs?: FsOps;
}): Promise<string> {
  const ops = options.fs ?? nodeFs;
  const target = await safeResolve(
    options.projectRoot,
    path.join(pluginsDir(options.projectRoot), options.name),
    ops,
  );
  if (!(await pathExists(ops, target))) {
    throw validationError(
      `plugin ${options.name} is not installed`,
      options.name,
    );
  }
  await ops.rm(target, { recursive: true, force: true });
  return target;
}
