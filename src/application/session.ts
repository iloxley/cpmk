import path from 'node:path';
import { systemClock, type Clock } from '../domain/clock.js';
import { normalizeTags } from '../domain/entry.js';
import { validationError } from '../domain/errors.js';
import { renderHandoffDocument } from '../domain/handoff-document.js';
import type { IdGenerator } from '../domain/ids.js';
import {
  findOpenSession,
  findPreviousSession,
  formatGitContentLines,
  SESSION_OPEN_TAG,
  SESSION_TAG,
} from '../domain/session.js';
import { validateEntryValue } from '../domain/validate.js';
import type { MemoryEntry } from '../domain/types.js';
import { readGitSnapshot, type GitSnapshot } from '../git/status.js';
import { writeAtomicFile } from '../storage/atomic.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { entryPath, generatedDir } from '../storage/paths.js';
import { safeResolve } from '../storage/root.js';
import { ProjectStore } from '../storage/store.js';
import { createHandoff } from './handoff.js';
import { listMemory } from './list.js';
import { rememberEntry } from './remember.js';

export interface SessionStatusData {
  open: boolean;
  id: string | null;
  title?: string;
  updatedAt?: string;
  activeTaskCount: number;
  git: Pick<GitSnapshot, 'branch' | 'commit' | 'dirty'> | null;
}

function gitLines(projectRoot: string): string[] {
  return formatGitContentLines(readGitSnapshot(projectRoot));
}

export async function startSession(options: {
  projectRoot: string;
  title?: string;
  contentLines?: readonly string[];
  clock?: Clock;
  ids?: IdGenerator;
  fs?: FsOps;
}): Promise<MemoryEntry> {
  const entries = await listMemory({
    projectRoot: options.projectRoot,
    ...(options.fs === undefined ? {} : { fs: options.fs }),
  });
  const open = findOpenSession(entries);
  if (open !== undefined) {
    throw validationError('a session is already open', open.id);
  }
  const title = (options.title ?? 'Session started').trim();
  const extra = options.contentLines ?? [];
  const content = [title, ...extra, ...gitLines(options.projectRoot)].join(
    '\n',
  );
  return rememberEntry({
    projectRoot: options.projectRoot,
    title,
    content,
    type: 'task',
    tags: [SESSION_TAG, SESSION_OPEN_TAG],
    ...(options.clock === undefined ? {} : { clock: options.clock }),
    ...(options.ids === undefined ? {} : { ids: options.ids }),
    ...(options.fs === undefined ? {} : { fs: options.fs }),
  });
}

export async function sessionStatus(options: {
  projectRoot: string;
  fs?: FsOps;
}): Promise<SessionStatusData> {
  const entries = await listMemory({
    projectRoot: options.projectRoot,
    ...(options.fs === undefined ? {} : { fs: options.fs }),
  });
  const open = findOpenSession(entries);
  const git = readGitSnapshot(options.projectRoot);
  const activeTaskCount = entries.filter(
    (entry) => entry.type === 'task' && entry.status === 'active',
  ).length;
  if (open === undefined) {
    return {
      open: false,
      id: null,
      activeTaskCount,
      git:
        git === undefined
          ? null
          : { branch: git.branch, commit: git.commit, dirty: git.dirty },
    };
  }
  return {
    open: true,
    id: open.id,
    title: open.title,
    updatedAt: open.updatedAt,
    activeTaskCount,
    git:
      git === undefined
        ? null
        : { branch: git.branch, commit: git.commit, dirty: git.dirty },
  };
}

async function closeSessionMarker(
  projectRoot: string,
  session: MemoryEntry,
  clock: Clock,
  fs?: FsOps,
): Promise<MemoryEntry> {
  const store = new ProjectStore(projectRoot, fs ?? nodeFs);
  const next = validateEntryValue(
    {
      ...session,
      tags: normalizeTags(
        session.tags.filter((tag) => tag !== SESSION_OPEN_TAG),
      ),
      status: 'archived',
      updatedAt: clock.now().toISOString(),
    },
    entryPath(projectRoot, session.id),
  );
  await store.writeEntry(next);
  return next;
}

export async function endSession(options: {
  projectRoot: string;
  summary?: string;
  clock?: Clock;
  ids?: IdGenerator;
  fs?: FsOps;
}): Promise<{ handoff: MemoryEntry; documentPath: string }> {
  const ops = options.fs ?? nodeFs;
  const clock = options.clock ?? systemClock;
  const entries = await listMemory({
    projectRoot: options.projectRoot,
    fs: ops,
  });
  const open = findOpenSession(entries);
  if (open === undefined) {
    throw validationError('no open session; run cpmk session start first');
  }
  const handoff = await createHandoff({
    projectRoot: options.projectRoot,
    clock,
    ...(options.summary === undefined ? {} : { summary: options.summary }),
    ...(options.ids === undefined ? {} : { ids: options.ids }),
  });
  const git = readGitSnapshot(options.projectRoot);
  const markdown = renderHandoffDocument({
    session: open,
    entries,
    ...(options.summary === undefined ? {} : { summary: options.summary }),
    ...(git === undefined ? {} : { git }),
  });
  const target = await safeResolve(
    options.projectRoot,
    path.join(generatedDir(options.projectRoot), 'handoff.md'),
    ops,
  );
  await writeAtomicFile(target, markdown, ops);
  await closeSessionMarker(options.projectRoot, open, clock, ops);
  return { handoff, documentPath: target };
}

export async function resumeSession(options: {
  projectRoot: string;
  summary?: string;
  clock?: Clock;
  ids?: IdGenerator;
  fs?: FsOps;
}): Promise<MemoryEntry> {
  const entries = await listMemory({
    projectRoot: options.projectRoot,
    ...(options.fs === undefined ? {} : { fs: options.fs }),
  });
  const open = findOpenSession(entries);
  if (open !== undefined) {
    throw validationError('a session is already open', open.id);
  }
  const previous = findPreviousSession(entries);
  const lines = [
    `Previous session: ${previous === undefined ? 'none' : previous.id}`,
  ];
  if (options.summary !== undefined && options.summary.trim().length > 0) {
    lines.push(options.summary.trim());
  }
  return startSession({
    projectRoot: options.projectRoot,
    contentLines: lines,
    ...(options.clock === undefined ? {} : { clock: options.clock }),
    ...(options.ids === undefined ? {} : { ids: options.ids }),
    ...(options.fs === undefined ? {} : { fs: options.fs }),
  });
}
