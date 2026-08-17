import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runPackagedCli } from '../helpers/cli.js';
import { withTempDir } from '../helpers/temp.js';

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

async function initGitRepo(directory: string): Promise<void> {
  git(directory, ['init', '-b', 'work']);
  await writeFile(path.join(directory, 'README.md'), 'repo\n');
  const init = await runPackagedCli(
    ['init', '--name', 'session-git'],
    directory,
  );
  expect(init.status).toBe(0);
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

describe('packaged session CLI', () => {
  it('starts, reports, ends, and resumes a session in a Git repo', async () => {
    await withTempDir(async (directory) => {
      await initGitRepo(directory);

      const none = await runPackagedCli(['session', 'status'], directory);
      expect(none.status).toBe(0);
      expect(none.stdout).toBe('session: none\n');

      const started = await runPackagedCli(
        ['session', 'start', '--title', 'API work'],
        directory,
      );
      expect(started.status).toBe(0);
      const sessionId = started.stdout.trim();
      expect(sessionId).toMatch(/^[0-9A-Z]{26}$/);

      const collision = await runPackagedCli(['session', 'start'], directory);
      expect(collision.status).toBe(1);
      expect(collision.stderr).toContain(sessionId);

      const status = await runPackagedCli(
        ['session', 'status', '--json'],
        directory,
      );
      expect(status.status).toBe(0);
      const payload = JSON.parse(status.stdout) as {
        ok: boolean;
        data: {
          open: boolean;
          id: string;
          title: string;
          git: { branch: string; dirty: boolean } | null;
        };
      };
      expect(payload.ok).toBe(true);
      expect(payload.data).toMatchObject({
        open: true,
        id: sessionId,
        title: 'API work',
      });
      expect(payload.data.git?.branch).toBe('work');

      const task = await runPackagedCli(
        ['remember', 'Keep this task', '--type', 'task'],
        directory,
      );
      expect(task.status).toBe(0);

      const ended = await runPackagedCli(
        ['session', 'end', 'Pause here'],
        directory,
      );
      expect(ended.status).toBe(0);
      expect(ended.stdout.trim()).toMatch(/^[0-9A-Z]{26}$/);

      const markdown = await readFile(
        path.join(directory, '.cpmk/generated/handoff.md'),
        'utf8',
      );
      expect(markdown).toContain('# CPMK Handoff');
      expect(markdown).toContain('Pause here');
      expect(markdown).toContain(`Closed session: ${sessionId}`);
      expect(markdown).toContain('Keep this task');

      const shownTask = await runPackagedCli(
        ['show', task.stdout.trim(), '--json'],
        directory,
      );
      expect(JSON.parse(shownTask.stdout)).toMatchObject({
        status: 'active',
      });

      const resumed = await runPackagedCli(
        ['session', 'resume', 'Pick this up'],
        directory,
      );
      expect(resumed.status).toBe(0);
      const newId = resumed.stdout.trim();
      expect(newId).not.toBe(sessionId);

      const shown = await runPackagedCli(['show', newId, '--json'], directory);
      const entry = JSON.parse(shown.stdout) as { content: string };
      expect(entry.content).toContain(`Previous session: ${sessionId}`);
      expect(entry.content).toContain('Pick this up');
      expect(entry.content).toContain('Branch: work');
    });
  });

  it('runs session commands in a directory that is not a Git repository', async () => {
    await withTempDir(async (directory) => {
      const init = await runPackagedCli(
        ['init', '--name', 'session-plain'],
        directory,
      );
      expect(init.status).toBe(0);

      const started = await runPackagedCli(['session', 'start'], directory);
      expect(started.status).toBe(0);

      const status = await runPackagedCli(['session', 'status'], directory);
      expect(status.status).toBe(0);
      expect(status.stdout).toContain(`session: ${started.stdout.trim()}`);
      expect(status.stdout).toContain('dirty: n/a');

      const ended = await runPackagedCli(['session', 'end'], directory);
      expect(ended.status).toBe(0);
      const markdown = await readFile(
        path.join(directory, '.cpmk/generated/handoff.md'),
        'utf8',
      );
      expect(markdown).toContain('not a repository');

      const missing = await runPackagedCli(['session', 'end'], directory);
      expect(missing.status).toBe(1);
      expect(missing.stderr).toMatch(/no open session/);
    });
  });
});
