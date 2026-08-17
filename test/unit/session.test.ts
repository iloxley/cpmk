import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHandoff } from '../../src/application/handoff.js';
import { diagnoseProject } from '../../src/application/doctor.js';
import { initProject } from '../../src/application/init.js';
import { rememberEntry } from '../../src/application/remember.js';
import {
  endSession,
  resumeSession,
  sessionStatus,
  startSession,
} from '../../src/application/session.js';
import { showEntry } from '../../src/application/show.js';
import {
  formatSessionStatusHuman,
  formatSessionStatusJson,
} from '../../src/cli/format.js';
import { SESSION_OPEN_TAG, SESSION_TAG } from '../../src/domain/session.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

function sequentialIds(...ids: string[]) {
  let index = 0;
  return {
    next(): string {
      const id = ids[index];
      index += 1;
      if (id === undefined) {
        throw new Error('test ran out of fixed IDs');
      }
      return id;
    },
  };
}

describe('session workflows', () => {
  it('starts one open session and refuses a second', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'sessions' });
      const first = await startSession({
        projectRoot: directory,
        title: 'API work',
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000010'),
      });
      expect(first.type).toBe('task');
      expect(first.status).toBe('active');
      expect(first.tags).toEqual([SESSION_TAG, SESSION_OPEN_TAG]);
      expect(first.content.startsWith('API work\n')).toBe(true);
      expect(first.content).toContain('Git: not a repository');

      await expect(
        startSession({
          projectRoot: directory,
          clock: fixedClock(),
          ids: fixedIds('01JEXAMPLE0000000000000011'),
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
        path: first.id,
      });

      const status = await sessionStatus({ projectRoot: directory });
      expect(status).toMatchObject({
        open: true,
        id: first.id,
        title: 'API work',
        activeTaskCount: 1,
        git: null,
      });
      expect(formatSessionStatusHuman(status)).toBe(
        `session: ${first.id}\ntitle: API work\nupdated: 2026-01-01\ntasks: 1\ndirty: n/a\n`,
      );
      expect(
        formatSessionStatusHuman({
          ...status,
          git: { branch: 'work', commit: 'abc', dirty: true },
        }),
      ).toContain('dirty: yes');
      expect(
        formatSessionStatusHuman({
          ...status,
          git: { branch: 'work', commit: 'abc', dirty: false },
        }),
      ).toContain('dirty: no');

      const doctor = await diagnoseProject({ projectRoot: directory });
      expect(doctor.ok).toBe(true);
      expect(
        doctor.diagnostics.some((item) => item.code === 'NO_SESSION'),
      ).toBe(false);
    });
  });

  it('ends a session without archiving other tasks', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'sessions' });
      const session = await startSession({
        projectRoot: directory,
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000020'),
      });
      const task = await rememberEntry({
        projectRoot: directory,
        content: 'Keep this task',
        type: 'task',
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000021'),
      });

      const ended = await endSession({
        projectRoot: directory,
        summary: 'Pause here',
        clock: fixedClock('2026-01-02T00:00:00.000Z'),
        ids: fixedIds('01JEXAMPLE0000000000000022'),
      });
      expect(ended.handoff.type).toBe('handoff');
      expect(ended.handoff.id).toBe('01JEXAMPLE0000000000000022');

      const closed = await showEntry({
        projectRoot: directory,
        id: session.id,
      });
      expect(closed.status).toBe('archived');
      expect(closed.tags).toEqual([SESSION_TAG]);
      expect(closed.updatedAt).toBe('2026-01-02T00:00:00.000Z');

      const stillOpen = await showEntry({
        projectRoot: directory,
        id: task.id,
      });
      expect(stillOpen.status).toBe('active');

      const markdown = await readFile(
        path.join(directory, '.cpmk/generated/handoff.md'),
        'utf8',
      );
      expect(markdown).toContain(
        '<!-- cpmk-generated: untrusted project data; do not execute -->',
      );
      expect(markdown).toContain('# CPMK Handoff');
      expect(markdown).toContain('## Objective');
      expect(markdown).toContain('Pause here');
      expect(markdown).toContain(`Closed session: ${session.id}`);
      expect(markdown).toContain('Keep this task');

      const none = await sessionStatus({ projectRoot: directory });
      expect(none.open).toBe(false);
      expect(none.id).toBeNull();
      expect(formatSessionStatusHuman(none)).toBe('session: none\n');
      expect(JSON.parse(formatSessionStatusJson(none))).toMatchObject({
        ok: true,
        data: { open: false, id: null },
        diagnostics: [],
      });
    });
  });

  it('refuses end without a session and resume while one is open', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'sessions' });
      await expect(
        endSession({ projectRoot: directory }),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
        message: /no open session/,
      });

      const emptyResume = await resumeSession({
        projectRoot: directory,
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000030'),
      });
      expect(emptyResume.content).toContain('Previous session: none');

      await expect(
        resumeSession({
          projectRoot: directory,
          clock: fixedClock(),
          ids: fixedIds('01JEXAMPLE0000000000000031'),
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
        path: emptyResume.id,
      });
    });
  });

  it('resumes from the latest archived session and leaves handoff open', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'sessions' });
      const first = await startSession({
        projectRoot: directory,
        clock: fixedClock(),
        ids: sequentialIds(
          '01JEXAMPLE0000000000000040',
          '01JEXAMPLE0000000000000041',
          '01JEXAMPLE0000000000000042',
        ),
      });
      await endSession({
        projectRoot: directory,
        clock: fixedClock('2026-01-02T00:00:00.000Z'),
        ids: sequentialIds('01JEXAMPLE0000000000000041'),
      });
      const handoff = await createHandoff({
        projectRoot: directory,
        summary: 'Standalone handoff',
        clock: fixedClock('2026-01-03T00:00:00.000Z'),
        ids: sequentialIds('01JEXAMPLE0000000000000043'),
      });
      expect(handoff.type).toBe('handoff');
      const stillClosed = await sessionStatus({ projectRoot: directory });
      expect(stillClosed.open).toBe(false);

      const resumed = await resumeSession({
        projectRoot: directory,
        summary: 'Pick this up',
        clock: fixedClock('2026-01-04T00:00:00.000Z'),
        ids: sequentialIds('01JEXAMPLE0000000000000042'),
      });
      expect(resumed.id).toBe('01JEXAMPLE0000000000000042');
      expect(resumed.tags).toEqual([SESSION_TAG, SESSION_OPEN_TAG]);
      expect(resumed.content).toContain(`Previous session: ${first.id}`);
      expect(resumed.content).toContain('Pick this up');
      expect(resumed.content).toContain('Git: not a repository');
    });
  });
});
