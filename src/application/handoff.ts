import { systemClock, type Clock } from '../domain/clock.js';
import { createUlidGenerator, type IdGenerator } from '../domain/ids.js';
import { formatGitContentLines } from '../domain/session.js';
import type { MemoryEntry } from '../domain/types.js';
import { readGitSnapshot } from '../git/status.js';
import { rememberEntry } from './remember.js';

export async function createHandoff(options: {
  projectRoot: string;
  summary?: string;
  clock?: Clock;
  ids?: IdGenerator;
}): Promise<MemoryEntry> {
  const summary = (options.summary ?? 'Session handoff').trim();
  const git = readGitSnapshot(options.projectRoot);
  const lines = [summary, ...formatGitContentLines(git)];
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
