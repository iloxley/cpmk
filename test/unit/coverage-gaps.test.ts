import { mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { diagnoseProject } from '../../src/application/doctor.js';
import { initProject } from '../../src/application/init.js';
import { listMemory } from '../../src/application/list.js';
import { rememberEntry } from '../../src/application/remember.js';
import { systemClock } from '../../src/domain/clock.js';
import { createDefaultConfig } from '../../src/domain/config.js';
import { ioError, pathUnsafe } from '../../src/domain/errors.js';
import { assertEntryFieldBounds } from '../../src/domain/entry.js';
import { compareByUpdatedThenId } from '../../src/domain/ordering.js';
import { renderContext, renderSection } from '../../src/domain/render.js';
import type { MemoryEntry } from '../../src/domain/types.js';
import {
  validateConfigValue,
  validateEntryValue,
} from '../../src/domain/validate.js';
import { serializeJson } from '../../src/storage/atomic.js';
import { nodeFs } from '../../src/storage/fs-ops.js';
import {
  resolveExistingDirectory,
  resolveProjectRoot,
} from '../../src/storage/root.js';
import { ProjectStore } from '../../src/storage/store.js';
import {
  formatDoctorHuman,
  formatListHuman,
  formatListJson,
} from '../../src/cli/format.js';
import { withTempDir } from '../helpers/temp.js';

const entry: MemoryEntry = {
  schemaVersion: 1,
  id: '01JEXAMPLE0000000000000000',
  type: 'fact',
  title: 'Title',
  content: 'Body',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'manual',
  status: 'active',
};

describe('remaining core branches', () => {
  it('rejects invalid list filters and empty remember content', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'gaps' });
      await expect(
        listMemory({ projectRoot: directory, type: 'note' }),
      ).rejects.toMatchObject({ code: 'USAGE' });
      await expect(
        listMemory({ projectRoot: directory, status: 'done' }),
      ).rejects.toMatchObject({ code: 'USAGE' });
      await expect(
        rememberEntry({ projectRoot: directory, content: '   ' }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });

  it('diagnoses missing and non-directory layout', async () => {
    await withTempDir(async (directory) => {
      const missing = await diagnoseProject({ projectRoot: directory });
      expect(missing.ok).toBe(false);
      expect(
        missing.diagnostics.some((item) => item.code === 'MISSING_LAYOUT'),
      ).toBe(true);
      expect(
        missing.diagnostics.some((item) => item.code === 'MISSING_CONFIG'),
      ).toBe(true);

      await writeFile(path.join(directory, '.cpmk'), 'not-a-dir');
      const file = await diagnoseProject({ projectRoot: directory });
      expect(
        file.diagnostics.some((item) => item.message.includes('directory')),
      ).toBe(true);
    });
  });

  it('diagnoses invalid config and store filename problems', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'gaps' });
      await writeFile(path.join(directory, '.cpmk/config.json'), '{');
      const result = await diagnoseProject({ projectRoot: directory });
      expect(
        result.diagnostics.some((item) => item.code === 'INVALID_CONFIG'),
      ).toBe(true);

      await writeFile(
        path.join(directory, '.cpmk/config.json'),
        serializeJson(createDefaultConfig('gaps')),
      );
      await writeFile(path.join(directory, '.cpmk/memory/notes.txt'), 'x');
      const store = new ProjectStore(directory);
      await expect(store.readAllEntries()).rejects.toMatchObject({
        code: 'VALIDATION',
      });
      await writeFile(
        path.join(directory, '.cpmk/memory/01JEXAMPLE0000000000000000.json'),
        serializeJson({ ...entry, id: '01JEXAMPLE0000000000000001' }),
      );
      await expect(
        store.readEntry('01JEXAMPLE0000000000000000'),
      ).rejects.toMatchObject({
        code: 'VALIDATION',
      });
      await store.writeConfig(createDefaultConfig('rewritten'));
      await store.ensureLayout();
    });
  });

  it('rejects a blank init name', async () => {
    await withTempDir(async (directory) => {
      await expect(
        initProject({ root: directory, name: '   ' }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });

  it('covers validators, clocks, and path helpers', () => {
    expect(() => {
      validateConfigValue({
        ...createDefaultConfig('x'),
        context: { defaultBudget: 0 },
      });
    }).toThrow(/defaultBudget/);
    expect(() => {
      validateEntryValue({ ...entry, id: 'short' });
    }).toThrow(/id/);
    expect(() => {
      validateEntryValue({ ...entry, type: 'note' });
    }).toThrow();
    expect(() => {
      validateEntryValue({ ...entry, source: 'chat' });
    }).toThrow();
    expect(() => {
      validateEntryValue({ ...entry, status: 'done' });
    }).toThrow();
    expect(() => {
      assertEntryFieldBounds({ ...entry, type: 'note' as MemoryEntry['type'] });
    }).toThrow(/type/);
    expect(() => {
      assertEntryFieldBounds({
        ...entry,
        source: 'chat' as MemoryEntry['source'],
      });
    }).toThrow(/source/);
    expect(() => {
      assertEntryFieldBounds({
        ...entry,
        status: 'done' as MemoryEntry['status'],
      });
    }).toThrow(/status/);
    expect(() => {
      assertEntryFieldBounds({ ...entry, tags: ['ok', 'ok'] });
    }).toThrow(/unique/);
    expect(systemClock.now()).toBeInstanceOf(Date);
    expect(compareByUpdatedThenId(entry, entry)).toBe(0);
    expect(renderSection('fact', [])).toBe('');
    expect(renderContext([]).endsWith('\n')).toBe(true);
    expect(pathUnsafe('nope').path).toBeUndefined();
    expect(ioError('disk').path).toBeUndefined();
    expect(formatListHuman([])).toBe('');
    expect(formatListHuman([entry])).toContain(entry.id);
    expect(formatListJson([entry])).toBe(`${JSON.stringify([entry])}\n`);
    expect(
      formatDoctorHuman({
        ok: true,
        data: { root: '/tmp', entryCount: 0, diagnosticCount: 0 },
        diagnostics: [],
      }),
    ).toContain('pass');
    expect(
      formatDoctorHuman({
        ok: false,
        data: { root: '/tmp', entryCount: 0, diagnosticCount: 1 },
        diagnostics: [
          {
            severity: 'error',
            code: 'X',
            path: 'a',
            message: 'bad',
          },
        ],
      }),
    ).toContain('fail');
  });

  it('diagnoses a .cpmk symlink that escapes the project', async () => {
    await withTempDir(async (directory) => {
      const project = path.join(directory, 'project');
      const outside = path.join(directory, 'outside-cpmk');
      await mkdir(project);
      await mkdir(outside);
      try {
        await symlink(outside, path.join(project, '.cpmk'));
      } catch {
        return;
      }
      const result = await diagnoseProject({ projectRoot: project });
      expect(
        result.diagnostics.some((item) => item.code === 'PATH_UNSAFE'),
      ).toBe(true);
    });
  });

  it('resolves an existing project root and rejects a file root', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'gaps' });
      await expect(resolveProjectRoot(directory)).resolves.toBeDefined();
      const file = path.join(directory, 'file.txt');
      await writeFile(file, 'x');
      await expect(
        resolveExistingDirectory(file, nodeFs),
      ).rejects.toMatchObject({
        code: 'IO',
      });
      await expect(
        resolveExistingDirectory(path.join(directory, 'missing'), nodeFs),
      ).rejects.toMatchObject({ code: 'IO' });
    });
  });
});
