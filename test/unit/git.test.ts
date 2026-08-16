import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHandoff } from '../../src/application/handoff.js';
import { installHooks, uninstallHooks } from '../../src/application/hook.js';
import { initProject } from '../../src/application/init.js';
import { readProjectStatus } from '../../src/application/status.js';
import { diagnoseProject } from '../../src/application/doctor.js';
import { readGitSnapshot } from '../../src/git/status.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

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

async function gitProject(directory: string): Promise<void> {
  await initProject({ root: directory, name: 'gitty' });
  git(directory, ['init', '-b', 'work']);
  await writeFile(path.join(directory, 'README.md'), 'repo\n');
  git(directory, ['add', '-A']);
  git(directory, [
    '-c',
    'user.name=CPMK Test',
    '-c',
    'user.email=cpmk@example.com',
    'commit',
    '-m',
    'init',
  ]);
}

describe('git awareness', () => {
  it('reads branch, commit, and dirty state from the Git CLI', async () => {
    await withTempDir(async (directory) => {
      expect(readGitSnapshot(directory)).toBeUndefined();
      await gitProject(directory);
      const clean = readGitSnapshot(directory);
      expect(clean?.branch).toBe('work');
      expect(clean?.dirty).toBe(false);
      await writeFile(path.join(directory, 'dirty.txt'), 'x');
      expect(readGitSnapshot(directory)?.dirty).toBe(true);
      const status = readProjectStatus(directory);
      expect(status.git?.dirty).toBe(true);
    });
  });

  it('creates a handoff entry and warns doctor about a dirty tree', async () => {
    await withTempDir(async (directory) => {
      await gitProject(directory);
      await writeFile(path.join(directory, 'dirty.txt'), 'x');
      const entry = await createHandoff({
        projectRoot: directory,
        summary: 'Pause here',
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000005'),
      });
      expect(entry.type).toBe('handoff');
      expect(entry.content).toContain('Branch: work');
      expect(entry.content).toContain('Dirty: yes');
      const doctor = await diagnoseProject({ projectRoot: directory });
      expect(doctor.ok).toBe(true);
      expect(
        doctor.diagnostics.some((item) => item.code === 'DIRTY_TREE'),
      ).toBe(true);
    });
  });

  it('records a handoff without Git and refuses foreign hooks', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'plain' });
      const status = readProjectStatus(directory);
      expect(status.git).toBeUndefined();
      const entry = await createHandoff({
        projectRoot: directory,
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000006'),
      });
      expect(entry.content).toContain('Git: not a repository');
      await expect(installHooks(directory)).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });
  });

  it('installs and removes only CPMK hooks', async () => {
    await withTempDir(async (directory) => {
      await gitProject(directory);
      const written = await installHooks(directory);
      expect(written.length).toBe(2);
      const body = await readFile(written[0] ?? '', 'utf8');
      expect(body).toContain('cpmk-hook v1');
      const removed = await uninstallHooks(directory);
      expect(removed).toHaveLength(2);
      const hooks = path.join(directory, '.git', 'hooks');
      await mkdir(hooks, { recursive: true });
      await writeFile(
        path.join(hooks, 'post-commit'),
        '#!/bin/sh\necho foreign\n',
      );
      await expect(installHooks(directory)).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    });
  });
});
