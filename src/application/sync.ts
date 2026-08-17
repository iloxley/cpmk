import path from 'node:path';
import { validationError } from '../domain/errors.js';
import { mergeEntries, type MergeResult } from '../domain/sync.js';
import { parseEntry } from '../domain/validate.js';
import type { MemoryEntry } from '../domain/types.js';
import { readMemoryAtRef } from '../git/memory.js';
import { serializeJson, writeAtomicFile } from '../storage/atomic.js';
import { nodeFs, pathExists, type FsOps } from '../storage/fs-ops.js';
import { generatedDir } from '../storage/paths.js';
import { discoverRoot, safeResolve } from '../storage/root.js';
import { ProjectStore } from '../storage/store.js';

export interface SyncReport extends MergeResult {
  conflictCount: number;
  addedCount: number;
}

export interface SyncConflictFile {
  schemaVersion: 1;
  conflicts: MergeResult['conflicts'];
}

function conflictPath(projectRoot: string): string {
  return path.join(generatedDir(projectRoot), 'sync-conflicts.json');
}

async function loadLocal(
  projectRoot: string,
  fs?: FsOps,
): Promise<MemoryEntry[]> {
  const store = new ProjectStore(projectRoot, fs ?? nodeFs);
  await store.readConfig();
  return store.readAllEntries();
}

export async function loadIncomingFromProject(
  sourceRoot: string,
  fs?: FsOps,
): Promise<MemoryEntry[]> {
  const ops = fs ?? nodeFs;
  const root = await discoverRoot(sourceRoot, ops);
  const store = new ProjectStore(root, ops);
  await store.readConfig();
  return store.readAllEntries();
}

export async function planSync(options: {
  projectRoot: string;
  from?: string;
  ref?: string;
  fs?: FsOps;
}): Promise<SyncReport> {
  if (
    (options.from === undefined) === (options.ref === undefined) ||
    (options.from !== undefined && options.ref !== undefined)
  ) {
    throw validationError('sync requires exactly one of --from or --ref');
  }
  const local = await loadLocal(options.projectRoot, options.fs);
  const incoming =
    options.ref === undefined
      ? await loadIncomingFromProject(options.from ?? '', options.fs)
      : readMemoryAtRef(options.projectRoot, options.ref);
  const merged = mergeEntries(local, incoming);
  return {
    ...merged,
    addedCount: merged.add.length,
    conflictCount: merged.conflicts.length,
  };
}

export async function applySync(options: {
  projectRoot: string;
  from?: string;
  ref?: string;
  fs?: FsOps;
}): Promise<SyncReport> {
  const ops = options.fs ?? nodeFs;
  const report = await planSync(options);
  const store = new ProjectStore(options.projectRoot, ops);
  for (const entry of report.add) {
    await store.writeEntry(entry);
  }
  const target = await safeResolve(
    options.projectRoot,
    conflictPath(options.projectRoot),
    ops,
  );
  await writeAtomicFile(
    target,
    serializeJson({
      schemaVersion: 1,
      conflicts: report.conflicts,
    } satisfies SyncConflictFile),
    ops,
  );
  return report;
}

export async function readSyncStatus(options: {
  projectRoot: string;
  fs?: FsOps;
}): Promise<SyncConflictFile> {
  const ops = options.fs ?? nodeFs;
  const target = path.join(
    generatedDir(options.projectRoot),
    'sync-conflicts.json',
  );
  if (!(await pathExists(ops, target))) {
    return { schemaVersion: 1, conflicts: [] };
  }
  const raw: unknown = JSON.parse(await ops.readFile(target));
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('schemaVersion' in raw) ||
    raw.schemaVersion !== 1 ||
    !('conflicts' in raw) ||
    !Array.isArray(raw.conflicts)
  ) {
    throw validationError('sync-conflicts.json is invalid', target);
  }
  return raw as SyncConflictFile;
}

export async function resolveSyncConflict(options: {
  projectRoot: string;
  id: string;
  keep: 'local' | 'incoming';
  fs?: FsOps;
}): Promise<MemoryEntry> {
  const ops = options.fs ?? nodeFs;
  const file = await readSyncStatus(options);
  const conflict = file.conflicts.find((item) => item.id === options.id);
  if (conflict === undefined) {
    throw validationError(`no sync conflict for ${options.id}`, options.id);
  }
  const chosen =
    options.keep === 'incoming'
      ? parseEntry(JSON.stringify(conflict.incoming), options.id)
      : parseEntry(JSON.stringify(conflict.local), options.id);
  if (options.keep === 'incoming') {
    const store = new ProjectStore(options.projectRoot, ops);
    await store.writeEntry(chosen);
  }
  const remaining = file.conflicts.filter((item) => item.id !== options.id);
  const target = await safeResolve(
    options.projectRoot,
    conflictPath(options.projectRoot),
    ops,
  );
  await writeAtomicFile(
    target,
    serializeJson({
      schemaVersion: 1,
      conflicts: remaining,
    } satisfies SyncConflictFile),
    ops,
  );
  return chosen;
}
