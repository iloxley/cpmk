import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { archiveEntry } from '../../src/application/archive.js';
import { editEntry } from '../../src/application/edit.js';
import { exportMemory } from '../../src/application/export-memory.js';
import { importMemory } from '../../src/application/import-memory.js';
import { initProject } from '../../src/application/init.js';
import { migrateProject } from '../../src/application/migrate.js';
import { rememberEntry } from '../../src/application/remember.js';
import { showEntry } from '../../src/application/show.js';
import { supersedeEntry } from '../../src/application/supersede.js';
import { pathMatchesDenyGlob } from '../../src/domain/globs.js';
import { serializeJson } from '../../src/storage/atomic.js';
import { nodeFs, pathExists } from '../../src/storage/fs-ops.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

describe('pathMatchesDenyGlob', () => {
  it('matches configured privacy globs', () => {
    expect(pathMatchesDenyGlob('/proj/.env', '**/.env*')).toBe(true);
    expect(pathMatchesDenyGlob('/proj/.env.local', '**/.env*')).toBe(true);
    expect(pathMatchesDenyGlob('/proj/notes.md', '**/.env*')).toBe(false);
    expect(pathMatchesDenyGlob('/proj/api-secret.json', '**/*secret*')).toBe(
      true,
    );
  });
});

describe('memory lifecycle', () => {
  it('shows, edits, archives, and supersedes entries', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'life' });
      const created = await rememberEntry({
        projectRoot: directory,
        content: 'original decision',
        type: 'decision',
        tags: ['old'],
        clock: fixedClock(),
        ids: fixedIds(),
      });
      const shown = await showEntry({ projectRoot: directory, id: created.id });
      expect(shown.content).toBe('original decision');

      const edited = await editEntry({
        projectRoot: directory,
        id: created.id,
        title: 'Revised title',
        clock: fixedClock('2026-01-02T00:00:00.000Z'),
      });
      expect(edited.title).toBe('Revised title');
      expect(edited.updatedAt).toBe('2026-01-02T00:00:00.000Z');

      const replaced = await supersedeEntry({
        projectRoot: directory,
        id: created.id,
        content: 'replacement decision',
        clock: fixedClock('2026-01-03T00:00:00.000Z'),
        ids: fixedIds('01JEXAMPLE0000000000000001'),
      });
      expect(replaced.previous.status).toBe('superseded');
      expect(replaced.next.status).toBe('active');
      expect(replaced.next.id).toBe('01JEXAMPLE0000000000000001');

      const archived = await archiveEntry({
        projectRoot: directory,
        id: replaced.next.id,
        clock: fixedClock('2026-01-04T00:00:00.000Z'),
      });
      expect(archived.status).toBe('archived');
      await expect(
        archiveEntry({ projectRoot: directory, id: archived.id }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });

  it('imports safe JSON and rejects deny-glob paths', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'life' });
      const source = path.join(directory, 'import.json');
      await writeFile(
        source,
        serializeJson({
          schemaVersion: 1,
          type: 'convention',
          title: 'Imported convention',
          content: 'Use conventional commits',
          tags: ['git'],
        }),
      );
      const imported = await importMemory({
        projectRoot: directory,
        sourcePath: source,
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000002'),
      });
      expect(imported).toHaveLength(1);
      expect(imported[0]?.source).toBe('import');
      expect(imported[0]?.id).toBe('01JEXAMPLE0000000000000002');

      const secret = path.join(directory, '.env.local');
      await writeFile(secret, '{"content":"nope"}');
      await expect(
        importMemory({ projectRoot: directory, sourcePath: secret }),
      ).rejects.toMatchObject({ code: 'PATH_UNSAFE' });
    });
  });

  it('exports JSON and writes a backup during migrate', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'life' });
      await rememberEntry({
        projectRoot: directory,
        content: 'export me',
        clock: fixedClock(),
        ids: fixedIds(),
      });
      const exported = await exportMemory({ projectRoot: directory });
      expect(exported.entries).toHaveLength(1);
      const output = path.join(directory, 'export.json');
      await exportMemory({ projectRoot: directory, output });
      expect(JSON.parse(await readFile(output, 'utf8'))).toHaveLength(1);

      const dry = await migrateProject({
        projectRoot: directory,
        dryRun: true,
        now: new Date('2026-01-01T00:00:00.000Z'),
      });
      expect(dry.changed).toBe(false);
      expect(dry.backupDir).toBeUndefined();

      const migrated = await migrateProject({
        projectRoot: directory,
        now: new Date('2026-01-01T00:00:00.000Z'),
      });
      expect(migrated.backupDir).toBeDefined();
      expect(
        await pathExists(
          nodeFs,
          path.join(migrated.backupDir ?? '', 'config.json'),
        ),
      ).toBe(true);
    });
  });

  it('rejects invalid lifecycle usage and unsafe imports', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'life' });
      await rememberEntry({
        projectRoot: directory,
        content: 'keep',
        clock: fixedClock(),
        ids: fixedIds(),
      });

      await expect(
        showEntry({ projectRoot: directory, id: 'bad' }),
      ).rejects.toMatchObject({ code: 'USAGE' });
      await expect(
        editEntry({ projectRoot: directory, id: '01JEXAMPLE0000000000000000' }),
      ).rejects.toMatchObject({ code: 'USAGE' });
      await expect(
        editEntry({
          projectRoot: directory,
          id: '01JEXAMPLE0000000000000000',
          type: 'note',
        }),
      ).rejects.toMatchObject({ code: 'USAGE' });
      await expect(
        archiveEntry({ projectRoot: directory, id: 'bad' }),
      ).rejects.toMatchObject({ code: 'USAGE' });
      await expect(
        supersedeEntry({
          projectRoot: directory,
          id: '01JEXAMPLE0000000000000000',
          content: '   ',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      await expect(
        supersedeEntry({
          projectRoot: directory,
          id: '01JEXAMPLE0000000000000000',
          content: 'next',
          type: 'note',
        }),
      ).rejects.toMatchObject({ code: 'USAGE' });
      await expect(
        migrateProject({ projectRoot: directory, to: 2 }),
      ).rejects.toMatchObject({ code: 'USAGE' });

      const missing = path.join(directory, 'missing.json');
      await expect(
        importMemory({ projectRoot: directory, sourcePath: missing }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      await writeFile(path.join(directory, 'empty.json'), '[]');
      await expect(
        importMemory({
          projectRoot: directory,
          sourcePath: path.join(directory, 'empty.json'),
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
      await writeFile(path.join(directory, 'not-json.json'), '{');
      await expect(
        importMemory({
          projectRoot: directory,
          sourcePath: path.join(directory, 'not-json.json'),
        }),
      ).rejects.toMatchObject({ code: 'INVALID_JSON' });
      await writeFile(path.join(directory, 'array.json'), '[{"content":"ok"}]');
      const fromArray = await importMemory({
        projectRoot: directory,
        sourcePath: path.join(directory, 'array.json'),
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000003'),
      });
      expect(fromArray[0]?.content).toBe('ok');
      await writeFile(
        path.join(directory, 'wrapped.json'),
        '{"entries":[{"content":"wrapped","type":"task"}]}',
      );
      const wrapped = await importMemory({
        projectRoot: directory,
        sourcePath: path.join(directory, 'wrapped.json'),
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000004'),
      });
      expect(wrapped[0]?.type).toBe('task');
    });
  });
});
