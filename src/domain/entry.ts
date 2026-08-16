import {
  CONTENT_MAX_LENGTH,
  ENTRY_SOURCES,
  ENTRY_STATUSES,
  ENTRY_TYPES,
  ID_PATTERN,
  TAG_MAX_COUNT,
  TAG_PATTERN,
  TIMESTAMP_PATTERN,
  TITLE_DEFAULT_LENGTH,
  TITLE_MAX_LENGTH,
  type EntrySource,
  type EntryStatus,
  type EntryType,
  type MemoryEntry,
} from './types.js';
import { validationError } from './errors.js';
import { truncateUnicode, unicodeLength } from './unicode.js';

export function isEntryType(value: string): value is EntryType {
  return (ENTRY_TYPES as readonly string[]).includes(value);
}

export function isEntryStatus(value: string): value is EntryStatus {
  return (ENTRY_STATUSES as readonly string[]).includes(value);
}

export function isEntrySource(value: string): value is EntrySource {
  return (ENTRY_SOURCES as readonly string[]).includes(value);
}

export function defaultTitle(content: string): string {
  const firstLine = content.split(/\r?\n/u, 1)[0] ?? content;
  return truncateUnicode(firstLine, TITLE_DEFAULT_LENGTH);
}

export function normalizeTags(tags: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const tag of tags) {
    unique.add(tag.trim().toLowerCase());
  }
  return [...unique].sort();
}

export function assertValidTimestamp(
  value: string,
  field: 'createdAt' | 'updatedAt',
  filePath?: string,
): void {
  if (!TIMESTAMP_PATTERN.test(value)) {
    throw validationError(
      `${field} must be a UTC ISO 8601 timestamp with millisecond precision`,
      filePath,
    );
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw validationError(`${field} is not a valid date`, filePath);
  }
}

export function assertEntryFieldBounds(
  entry: MemoryEntry,
  filePath?: string,
): void {
  if (!ID_PATTERN.test(entry.id)) {
    throw validationError(
      'id must be a 26-character ULID using A-Z and 0-9',
      filePath,
    );
  }
  const titleLength = unicodeLength(entry.title);
  if (titleLength < 1 || titleLength > TITLE_MAX_LENGTH) {
    throw validationError(
      `title must be 1-${TITLE_MAX_LENGTH} Unicode characters after trimming`,
      filePath,
    );
  }
  const contentLength = unicodeLength(entry.content);
  if (contentLength < 1 || contentLength > CONTENT_MAX_LENGTH) {
    throw validationError(
      `content must be 1-${CONTENT_MAX_LENGTH} Unicode characters after trimming`,
      filePath,
    );
  }
  if (entry.tags.length > TAG_MAX_COUNT) {
    throw validationError(
      `tags must contain at most ${TAG_MAX_COUNT} values`,
      filePath,
    );
  }
  const seen = new Set<string>();
  for (const tag of entry.tags) {
    if (!TAG_PATTERN.test(tag)) {
      throw validationError(
        'each tag must match [a-z0-9][a-z0-9-]{0,39}',
        filePath,
      );
    }
    if (seen.has(tag)) {
      throw validationError('tags must be unique', filePath);
    }
    seen.add(tag);
  }
  assertValidTimestamp(entry.createdAt, 'createdAt', filePath);
  assertValidTimestamp(entry.updatedAt, 'updatedAt', filePath);
  if (entry.updatedAt < entry.createdAt) {
    throw validationError('updatedAt cannot precede createdAt', filePath);
  }
  if (!isEntryType(entry.type)) {
    throw validationError('type is not a supported memory type', filePath);
  }
  if (!isEntrySource(entry.source)) {
    throw validationError('source is not a supported value', filePath);
  }
  if (!isEntryStatus(entry.status)) {
    throw validationError('status is not a supported value', filePath);
  }
}

export function filenameForId(id: string): string {
  return `${id}.json`;
}
