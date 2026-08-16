import { systemClock, type Clock } from '../domain/clock.js';
import { usageError, validationError } from '../domain/errors.js';
import { ID_PATTERN, type MemoryEntry } from '../domain/types.js';
import { validateEntryValue } from '../domain/validate.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { entryPath } from '../storage/paths.js';
import { ProjectStore } from '../storage/store.js';

export async function archiveEntry(options: {
  projectRoot: string;
  id: string;
  clock?: Clock;
  fs?: FsOps;
}): Promise<MemoryEntry> {
  if (!ID_PATTERN.test(options.id)) {
    throw usageError('id must be a 26-character ULID');
  }
  const store = new ProjectStore(options.projectRoot, options.fs ?? nodeFs);
  await store.readConfig();
  const current = await store.readEntry(options.id);
  if (current.status === 'archived') {
    throw validationError('entry is already archived', options.id);
  }
  const next = validateEntryValue(
    {
      ...current,
      status: 'archived',
      updatedAt: (options.clock ?? systemClock).now().toISOString(),
    },
    entryPath(options.projectRoot, options.id),
  );
  await store.writeEntry(next);
  return next;
}
