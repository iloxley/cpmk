import { ID_PATTERN, type MemoryEntry } from '../domain/types.js';
import { usageError } from '../domain/errors.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { ProjectStore } from '../storage/store.js';

export async function showEntry(options: {
  projectRoot: string;
  id: string;
  fs?: FsOps;
}): Promise<MemoryEntry> {
  if (!ID_PATTERN.test(options.id)) {
    throw usageError('id must be a 26-character ULID');
  }
  const store = new ProjectStore(options.projectRoot, options.fs ?? nodeFs);
  await store.readConfig();
  return store.readEntry(options.id);
}
