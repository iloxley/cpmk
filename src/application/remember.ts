import { systemClock, type Clock } from '../domain/clock.js';
import { defaultTitle, isEntryType, normalizeTags } from '../domain/entry.js';
import { createUlidGenerator, type IdGenerator } from '../domain/ids.js';
import { usageError, validationError } from '../domain/errors.js';
import { SCHEMA_VERSION, type MemoryEntry } from '../domain/types.js';
import { validateEntryValue } from '../domain/validate.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { entryPath } from '../storage/paths.js';
import { ProjectStore } from '../storage/store.js';

export async function rememberEntry(options: {
  projectRoot: string;
  content: string;
  title?: string;
  type?: string;
  tags?: readonly string[];
  clock?: Clock;
  ids?: IdGenerator;
  fs?: FsOps;
}): Promise<MemoryEntry> {
  const store = new ProjectStore(options.projectRoot, options.fs ?? nodeFs);
  await store.readConfig();

  const content = options.content.trim();
  if (content.length === 0) {
    throw validationError('content must be a non-empty string after trimming');
  }

  const type = options.type ?? 'fact';
  if (!isEntryType(type)) {
    throw usageError(
      `type must be one of fact, decision, convention, task, handoff, warning`,
    );
  }

  const title = (options.title ?? defaultTitle(content)).trim();
  const now = (options.clock ?? systemClock).now().toISOString();
  const entry = validateEntryValue(
    {
      schemaVersion: SCHEMA_VERSION,
      id: (options.ids ?? createUlidGenerator()).next(),
      type,
      title,
      content,
      tags: normalizeTags(options.tags ?? []),
      createdAt: now,
      updatedAt: now,
      source: 'manual',
      status: 'active',
    },
    entryPath(options.projectRoot, 'new'),
  );

  await store.writeEntry(entry);
  return entry;
}
