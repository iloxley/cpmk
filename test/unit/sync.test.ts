import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/application/init.js';
import { rememberEntry } from '../../src/application/remember.js';
import {
  applySync,
  planSync,
  readSyncStatus,
  resolveSyncConflict,
} from '../../src/application/sync.js';
import { mergeEntries } from '../../src/domain/sync.js';
import type { MemoryEntry } from '../../src/domain/types.js';
import { serializeJson } from '../../src/storage/atomic.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

const base: MemoryEntry = {
  schemaVersion: 1,
  id: '01JEXAMPLE0000000000000000',
  type: 'fact',
  title: 'One',
  content: 'local',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'manual',
  status: 'active',
};

function git(cwd: string, args: readonly string[]): void {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'CPMK Test',
      GIT_AUTHOR_EMAIL: 'cpmk@example.com',
      GIT_COMMITTER_NAME: 'CPMK Test',
      GIT_COMMITTER_EMAIL: 'cpmk@example.com',
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'git failed');
  }
}

describe('mergeEntries', () => {
  it('adds new ids and records conflicts without smashing', () => {
    const merged = mergeEntries(
      [base],
      [
        { ...base, content: 'incoming' },
        { ...base, id: '01JEXAMPLE0000000000000001', content: 'new' },
      ],
    );
    expect(merged.unchanged).toBe(0);
    expect(merged.add).toHaveLength(1);
    expect(merged.conflicts).toHaveLength(1);
    expect(merged.conflicts[0]?.local.content).toBe('local');
    expect(merged.conflicts[0]?.incoming.content).toBe('incoming');
    expect(mergeEntries([base], [base]).unchanged).toBe(1);
  });
});

describe('applySync', () => {
  it('merges another project and resolves conflicts', async () => {
    await withTempDir(async (directory) => {
      const local = path.join(directory, 'local');
      const remote = path.join(directory, 'remote');
      await mkdir(local);
      await mkdir(remote);
      await initProject({ root: local, name: 'local' });
      await initProject({ root: remote, name: 'remote' });
      expect(await readSyncStatus({ projectRoot: local })).toEqual({
        schemaVersion: 1,
        conflicts: [],
      });
      await expect(
        planSync({ projectRoot: local, ref: 'HEAD' }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      await writeFile(
        path.join(local, '.cpmk/generated/sync-conflicts.json'),
        '{}\n',
      );
      await expect(
        readSyncStatus({ projectRoot: local }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      await rememberEntry({
        projectRoot: local,
        content: 'local only',
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000010'),
      });
      await rememberEntry({
        projectRoot: remote,
        content: 'remote only',
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000011'),
      });
      await writeFile(
        path.join(local, '.cpmk/memory/01JEXAMPLE0000000000000012.json'),
        serializeJson({ ...base, id: '01JEXAMPLE0000000000000012' }),
      );
      await writeFile(
        path.join(remote, '.cpmk/memory/01JEXAMPLE0000000000000012.json'),
        serializeJson({
          ...base,
          id: '01JEXAMPLE0000000000000012',
          content: 'changed',
        }),
      );

      const preview = await planSync({ projectRoot: local, from: remote });
      expect(preview.addedCount).toBe(1);
      expect(preview.conflictCount).toBe(1);

      const applied = await applySync({ projectRoot: local, from: remote });
      expect(applied.addedCount).toBe(1);
      const status = await readSyncStatus({ projectRoot: local });
      expect(status.conflicts).toHaveLength(1);
      const kept = await resolveSyncConflict({
        projectRoot: local,
        id: '01JEXAMPLE0000000000000012',
        keep: 'incoming',
      });
      expect(kept.content).toBe('changed');
      expect(
        JSON.parse(
          await readFile(
            path.join(local, '.cpmk/generated/sync-conflicts.json'),
            'utf8',
          ),
        ),
      ).toMatchObject({ conflicts: [] });

      await expect(planSync({ projectRoot: local })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
      const localKeep = await applySync({ projectRoot: local, from: remote });
      expect(localKeep.conflictCount).toBe(0);
      await expect(
        resolveSyncConflict({
          projectRoot: local,
          id: '01JEXAMPLE0000000000000099',
          keep: 'local',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });

  it('reads incoming memory from a Git ref', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'git-sync' });
      git(directory, ['init', '-b', 'main']);
      await rememberEntry({
        projectRoot: directory,
        content: 'on main',
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000020'),
      });
      git(directory, ['add', '-A']);
      git(directory, [
        '-c',
        'user.name=CPMK Test',
        '-c',
        'user.email=cpmk@example.com',
        'commit',
        '-m',
        'main',
      ]);
      git(directory, ['checkout', '-b', 'other']);
      await rememberEntry({
        projectRoot: directory,
        content: 'on other',
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000021'),
      });
      git(directory, ['add', '-A']);
      git(directory, [
        '-c',
        'user.name=CPMK Test',
        '-c',
        'user.email=cpmk@example.com',
        'commit',
        '-m',
        'other',
      ]);
      git(directory, ['checkout', 'main']);
      const report = await applySync({
        projectRoot: directory,
        ref: 'other',
      });
      expect(report.addedCount).toBe(1);
      await expect(
        applySync({ projectRoot: directory, ref: 'missing' }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });
});
