import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/application/init.js';
import { listMemory } from '../../src/application/list.js';
import { rememberEntry } from '../../src/application/remember.js';
import { parseEntry } from '../../src/domain/validate.js';
import { entryPath } from '../../src/storage/paths.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

describe('rememberEntry', () => {
  it('writes a validated manual entry with defaults', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'mem' });
      const entry = await rememberEntry({
        projectRoot: directory,
        content: 'API errors use RFC 9457 problem details\nMore',
        clock: fixedClock(),
        ids: fixedIds(),
      });
      expect(entry.id).toBe('01JEXAMPLE0000000000000000');
      expect(entry.type).toBe('fact');
      expect(entry.title).toBe('API errors use RFC 9457 problem details');
      expect(entry.source).toBe('manual');
      expect(entry.status).toBe('active');
      const raw = await readFile(entryPath(directory, entry.id), 'utf8');
      expect(parseEntry(raw, 'entry.json')).toEqual(entry);
    });
  });

  it('normalizes tags and rejects invalid types', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'mem' });
      const entry = await rememberEntry({
        projectRoot: directory,
        content: 'Never commit credentials',
        title: 'Secrets stay out',
        type: 'warning',
        tags: ['Security', 'security', 'privacy'],
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000001'),
      });
      expect(entry.tags).toEqual(['privacy', 'security']);
      await expect(
        rememberEntry({
          projectRoot: directory,
          content: 'nope',
          type: 'note',
        }),
      ).rejects.toMatchObject({ code: 'USAGE', exitCode: 2 });
    });
  });
});

describe('listMemory', () => {
  it('filters and orders entries', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'mem' });
      await rememberEntry({
        projectRoot: directory,
        content: 'first',
        type: 'fact',
        tags: ['one'],
        clock: fixedClock('2026-01-01T00:00:00.000Z'),
        ids: fixedIds('01JEXAMPLE0000000000000000'),
      });
      await rememberEntry({
        projectRoot: directory,
        content: 'second',
        type: 'warning',
        tags: ['two'],
        clock: fixedClock('2026-01-02T00:00:00.000Z'),
        ids: fixedIds('01JEXAMPLE0000000000000001'),
      });
      const all = await listMemory({ projectRoot: directory });
      expect(all.map((item) => item.id)).toEqual([
        '01JEXAMPLE0000000000000001',
        '01JEXAMPLE0000000000000000',
      ]);
      const warnings = await listMemory({
        projectRoot: directory,
        type: 'warning',
        tag: 'TWO',
        status: 'active',
      });
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.title).toBe('second');
    });
  });

  it('fails closed on a corrupt memory file', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'mem' });
      await writeFile(
        path.join(directory, '.cpmk/memory/01JEXAMPLE0000000000000000.json'),
        '{',
      );
      await expect(
        listMemory({ projectRoot: directory }),
      ).rejects.toMatchObject({
        code: 'INVALID_JSON',
      });
    });
  });
});
