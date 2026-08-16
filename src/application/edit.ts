import { systemClock, type Clock } from '../domain/clock.js';
import { isEntryType, normalizeTags } from '../domain/entry.js';
import { usageError, validationError } from '../domain/errors.js';
import { ID_PATTERN, type MemoryEntry } from '../domain/types.js';
import { validateEntryValue } from '../domain/validate.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { entryPath } from '../storage/paths.js';
import { ProjectStore } from '../storage/store.js';

export async function editEntry(options: {
  projectRoot: string;
  id: string;
  title?: string;
  content?: string;
  type?: string;
  tags?: readonly string[];
  clock?: Clock;
  fs?: FsOps;
}): Promise<MemoryEntry> {
  if (!ID_PATTERN.test(options.id)) {
    throw usageError('id must be a 26-character ULID');
  }
  if (
    options.title === undefined &&
    options.content === undefined &&
    options.type === undefined &&
    options.tags === undefined
  ) {
    throw usageError('edit requires --title, --content, --type, or --tag');
  }
  if (options.type !== undefined && !isEntryType(options.type)) {
    throw usageError(
      'type must be one of fact, decision, convention, task, handoff, warning',
    );
  }

  const store = new ProjectStore(options.projectRoot, options.fs ?? nodeFs);
  await store.readConfig();
  const current = await store.readEntry(options.id);
  const next = validateEntryValue(
    {
      ...current,
      ...(options.title === undefined ? {} : { title: options.title.trim() }),
      ...(options.content === undefined
        ? {}
        : { content: options.content.trim() }),
      ...(options.type === undefined ? {} : { type: options.type }),
      ...(options.tags === undefined
        ? {}
        : { tags: normalizeTags(options.tags) }),
      updatedAt: (options.clock ?? systemClock).now().toISOString(),
    },
    entryPath(options.projectRoot, options.id),
  );
  if (
    next.title === current.title &&
    next.content === current.content &&
    next.type === current.type &&
    next.tags.join('\0') === current.tags.join('\0')
  ) {
    throw validationError('edit did not change any fields');
  }
  await store.writeEntry(next);
  return next;
}
