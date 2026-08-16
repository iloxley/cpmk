import path from 'node:path';
import { systemClock, type Clock } from '../domain/clock.js';
import { defaultTitle, isEntryType, normalizeTags } from '../domain/entry.js';
import { pathDeniedByGlobs } from '../domain/globs.js';
import { createUlidGenerator, type IdGenerator } from '../domain/ids.js';
import { invalidJson, pathUnsafe, validationError } from '../domain/errors.js';
import { SCHEMA_VERSION, type MemoryEntry } from '../domain/types.js';
import { validateEntryValue } from '../domain/validate.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { entryPath } from '../storage/paths.js';
import { ProjectStore } from '../storage/store.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function extractCandidates(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (isRecord(value) && Array.isArray(value.entries)) {
    return value.entries;
  }
  if (isRecord(value)) {
    return [value];
  }
  throw validationError(
    'import file must be an entry object, an array, or { "entries": [...] }',
  );
}

export async function importMemory(options: {
  projectRoot: string;
  sourcePath: string;
  clock?: Clock;
  ids?: IdGenerator;
  fs?: FsOps;
}): Promise<MemoryEntry[]> {
  const ops = options.fs ?? nodeFs;
  const store = new ProjectStore(options.projectRoot, ops);
  const config = await store.readConfig();
  const absolute = path.resolve(options.sourcePath);
  const denied = pathDeniedByGlobs(absolute, config.privacy.denyGlobs);
  if (denied !== undefined) {
    throw pathUnsafe(`import path matches deny glob ${denied}`, absolute);
  }

  let raw: string;
  try {
    raw = await ops.readFile(absolute);
  } catch {
    throw validationError('import path could not be read', absolute);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw invalidJson(absolute);
  }

  const clock = options.clock ?? systemClock;
  const ids = options.ids ?? createUlidGenerator();
  const imported: MemoryEntry[] = [];
  for (const candidate of extractCandidates(parsed)) {
    if (!isRecord(candidate)) {
      throw validationError('each imported value must be an object', absolute);
    }
    const content = asString(candidate.content)?.trim() ?? '';
    if (content.length === 0) {
      throw validationError(
        'imported content must be a non-empty string',
        absolute,
      );
    }
    const type = asString(candidate.type) ?? 'fact';
    if (!isEntryType(type)) {
      throw validationError('imported type is not supported', absolute);
    }
    const tags = Array.isArray(candidate.tags)
      ? candidate.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];
    const now = clock.now().toISOString();
    const entry = validateEntryValue(
      {
        schemaVersion: SCHEMA_VERSION,
        id: ids.next(),
        type,
        title: (asString(candidate.title) ?? defaultTitle(content)).trim(),
        content,
        tags: normalizeTags(tags),
        createdAt: now,
        updatedAt: now,
        source: 'import',
        status: 'active',
      },
      entryPath(options.projectRoot, 'import'),
    );
    await store.writeEntry(entry);
    imported.push(entry);
  }
  if (imported.length === 0) {
    throw validationError('import file did not contain any entries', absolute);
  }
  return imported;
}
