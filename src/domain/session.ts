import { sortForList } from './ordering.js';
import type { MemoryEntry } from './types.js';

export const SESSION_TAG = 'session';
export const SESSION_OPEN_TAG = 'session-open';

export function isOpenSession(entry: MemoryEntry): boolean {
  return (
    entry.type === 'task' &&
    entry.status === 'active' &&
    entry.tags.includes(SESSION_TAG) &&
    entry.tags.includes(SESSION_OPEN_TAG)
  );
}

export function isSessionMarker(entry: MemoryEntry): boolean {
  return entry.type === 'task' && entry.tags.includes(SESSION_TAG);
}

export function findOpenSession(
  entries: readonly MemoryEntry[],
): MemoryEntry | undefined {
  return sortForList(entries.filter(isOpenSession))[0];
}

export function findPreviousSession(
  entries: readonly MemoryEntry[],
): MemoryEntry | undefined {
  return sortForList(
    entries.filter(
      (entry) => isSessionMarker(entry) && entry.status === 'archived',
    ),
  )[0];
}

export function parsePreviousSessionId(content: string): string | undefined {
  const match = /(?:^|\n)Previous session: ([0-9A-Z]{26}|none)(?:\n|$)/u.exec(
    content,
  );
  const value = match?.[1];
  return value === undefined || value === 'none' ? undefined : value;
}

export function formatGitContentLines(
  git: { branch: string; commit: string; dirty: boolean } | undefined,
): string[] {
  if (git === undefined) {
    return ['Git: not a repository'];
  }
  return [
    `Branch: ${git.branch}`,
    `Commit: ${git.commit}`,
    `Dirty: ${git.dirty ? 'yes' : 'no'}`,
  ];
}
