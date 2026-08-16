import { systemClock, type Clock } from '../domain/clock.js';
import { createUlidGenerator, type IdGenerator } from '../domain/ids.js';
import { rememberEntry } from './remember.js';
import { readGitSnapshot } from '../git/status.js';
import type { MemoryEntry } from '../domain/types.js';

export async function createHandoff(options: {
  projectRoot: string;
  summary?: string;
  clock?: Clock;
  ids?: IdGenerator;
}): Promise<MemoryEntry> {
  const git = readGitSnapshot(options.projectRoot);
  const summary = (options.summary ?? 'Session handoff').trim();
  const lines = [summary];
  if (git !== undefined) {
    lines.push(`Branch: ${git.branch}`);
    lines.push(`Commit: ${git.commit}`);
    lines.push(`Dirty: ${git.dirty ? 'yes' : 'no'}`);
  } else {
    lines.push('Git: not a repository');
  }
  return rememberEntry({
    projectRoot: options.projectRoot,
    content: lines.join('\n'),
    title: git === undefined ? summary : `Handoff on ${git.branch}`,
    type: 'handoff',
    tags: ['handoff'],
    clock: options.clock ?? systemClock,
    ids: options.ids ?? createUlidGenerator(),
  });
}
