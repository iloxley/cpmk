import { isEntryStatus, isEntryType } from '../domain/entry.js';
import { usageError } from '../domain/errors.js';
import { sortForList } from '../domain/ordering.js';
import type { MemoryEntry } from '../domain/types.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { ProjectStore } from '../storage/store.js';

export async function listMemory(options: {
  projectRoot: string;
  type?: string;
  tag?: string;
  status?: string;
  fs?: FsOps;
}): Promise<MemoryEntry[]> {
  if (options.type !== undefined && !isEntryType(options.type)) {
    throw usageError(
      'type must be one of fact, decision, convention, task, handoff, warning',
    );
  }
  if (options.status !== undefined && !isEntryStatus(options.status)) {
    throw usageError('status must be one of active, superseded, archived');
  }

  const store = new ProjectStore(options.projectRoot, options.fs ?? nodeFs);
  await store.readConfig();
  let entries = await store.readAllEntries();

  if (options.type !== undefined) {
    entries = entries.filter((entry) => entry.type === options.type);
  }
  if (options.tag !== undefined) {
    const tag = options.tag.trim().toLowerCase();
    entries = entries.filter((entry) => entry.tags.includes(tag));
  }
  if (options.status !== undefined) {
    entries = entries.filter((entry) => entry.status === options.status);
  }

  return sortForList(entries);
}
