import { systemClock, type Clock } from '../domain/clock.js';
import { defaultTitle, isEntryType, normalizeTags } from '../domain/entry.js';
import { createUlidGenerator, type IdGenerator } from '../domain/ids.js';
import { usageError, validationError } from '../domain/errors.js';
import {
  ID_PATTERN,
  SCHEMA_VERSION,
  type MemoryEntry,
} from '../domain/types.js';
import { validateEntryValue } from '../domain/validate.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { entryPath } from '../storage/paths.js';
import { ProjectStore } from '../storage/store.js';

export interface SupersedeResult {
  previous: MemoryEntry;
  next: MemoryEntry;
}

export async function supersedeEntry(options: {
  projectRoot: string;
  id: string;
  content: string;
  title?: string;
  type?: string;
  tags?: readonly string[];
  clock?: Clock;
  ids?: IdGenerator;
  fs?: FsOps;
}): Promise<SupersedeResult> {
  if (!ID_PATTERN.test(options.id)) {
    throw usageError('id must be a 26-character ULID');
  }
  const content = options.content.trim();
  if (content.length === 0) {
    throw validationError('content must be a non-empty string after trimming');
  }
  if (options.type !== undefined && !isEntryType(options.type)) {
    throw usageError(
      'type must be one of fact, decision, convention, task, handoff, warning',
    );
  }

  const store = new ProjectStore(options.projectRoot, options.fs ?? nodeFs);
  await store.readConfig();
  const current = await store.readEntry(options.id);
  if (current.status !== 'active') {
    throw validationError('only active entries can be superseded', options.id);
  }

  const now = (options.clock ?? systemClock).now().toISOString();
  const previous = validateEntryValue(
    {
      ...current,
      status: 'superseded',
      updatedAt: now,
    },
    entryPath(options.projectRoot, current.id),
  );
  const next = validateEntryValue(
    {
      schemaVersion: SCHEMA_VERSION,
      id: (options.ids ?? createUlidGenerator()).next(),
      type: options.type ?? current.type,
      title: (options.title ?? defaultTitle(content)).trim(),
      content,
      tags: normalizeTags(options.tags ?? current.tags),
      createdAt: now,
      updatedAt: now,
      source: 'manual',
      status: 'active',
    },
    entryPath(options.projectRoot, 'new'),
  );

  await store.writeEntry(previous);
  await store.writeEntry(next);
  return { previous, next };
}
