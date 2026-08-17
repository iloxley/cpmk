import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { diagnoseProject } from '../../src/application/doctor.js';
import { initProject } from '../../src/application/init.js';
import { rememberEntry } from '../../src/application/remember.js';
import { serializeJson } from '../../src/storage/atomic.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

const valid = {
  schemaVersion: 1,
  id: '01JEXAMPLE0000000000000000',
  type: 'fact',
  title: 'Valid',
  content: 'ok',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'manual',
  status: 'active',
};

describe('diagnoseProject', () => {
  it('passes a healthy project', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'ok' });
      await rememberEntry({
        projectRoot: directory,
        content: 'healthy',
        clock: fixedClock(),
        ids: fixedIds(),
      });
      const result = await diagnoseProject({ projectRoot: directory });
      expect(result.ok).toBe(true);
      expect(result.data.entryCount).toBe(1);
      expect(result.diagnostics).toEqual([
        {
          severity: 'warning',
          code: 'NO_SESSION',
          path: '.cpmk/memory',
          message:
            'no open session; run cpmk session start when you begin work',
        },
      ]);
    });
  });

  it('reports layout, schema, filename, duplicate, and timestamp problems', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'sick' });
      await writeFile(
        path.join(directory, '.cpmk/memory/not-a-ulid.json'),
        '{',
      );
      await writeFile(path.join(directory, '.cpmk/memory/notes.txt'), 'nope');
      await writeFile(
        path.join(directory, '.cpmk/memory/01JEXAMPLE0000000000000000.json'),
        serializeJson(valid),
      );
      await writeFile(
        path.join(directory, '.cpmk/memory/01JEXAMPLE0000000000000001.json'),
        serializeJson({
          ...valid,
          id: '01JEXAMPLE0000000000000000',
        }),
      );
      await writeFile(
        path.join(directory, '.cpmk/memory/01JEXAMPLE0000000000000002.json'),
        serializeJson({
          ...valid,
          id: '01JEXAMPLE0000000000000002',
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      );
      const result = await diagnoseProject({ projectRoot: directory });
      expect(result.ok).toBe(false);
      const codes = result.diagnostics.map((item) => item.code);
      expect(codes).toContain('INVALID_FILENAME');
      expect(codes).toContain('UNEXPECTED_FILE');
      expect(codes).toContain('INVALID_ENTRY');
      expect(codes).toContain('DUPLICATE_ID');
      expect(
        result.diagnostics.every((item) => !item.message.includes('nope')),
      ).toBe(true);
    });
  });

  it('reports a missing generated directory', async () => {
    await withTempDir(async (directory) => {
      await mkdir(path.join(directory, '.cpmk/memory'), { recursive: true });
      await writeFile(
        path.join(directory, '.cpmk/config.json'),
        serializeJson({
          schemaVersion: 1,
          project: { name: 'x' },
          context: { defaultBudget: 12000 },
          privacy: { denyGlobs: [] },
        }),
      );
      const result = await diagnoseProject({ projectRoot: directory });
      expect(
        result.diagnostics.some((item) => item.path.includes('generated')),
      ).toBe(true);
    });
  });
});
