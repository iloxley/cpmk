import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContext } from '../../src/application/context.js';
import { initProject } from '../../src/application/init.js';
import { rememberEntry } from '../../src/application/remember.js';
import { headerBudget } from '../../src/domain/selection.js';
import { fixedClock, fixedIds, real, withTempDir } from '../helpers/temp.js';

describe('buildContext', () => {
  it('renders active entries and can write atomically inside the root', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'ctx' });
      await rememberEntry({
        projectRoot: directory,
        content: 'Milestone 1 stores one JSON file per memory entry.',
        title: 'Use SQLite later, not in core',
        type: 'decision',
        tags: ['architecture', 'storage'],
        clock: fixedClock(),
        ids: fixedIds(),
      });
      const result = await buildContext({ projectRoot: directory });
      expect(result.markdown).toContain('# CPMK Project Context');
      expect(result.markdown).toContain('## Decisions');

      const output = path.join(directory, 'context.md');
      const written = await buildContext({
        projectRoot: directory,
        output,
        budget: 400,
      });
      expect(written.writtenTo).toBe(await real(output));
      expect(await readFile(output, 'utf8')).toBe(written.markdown);
    });
  });

  it('rejects an output path outside the project', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'ctx' });
      await expect(
        buildContext({
          projectRoot: directory,
          output: path.join(directory, '..', 'escape.md'),
        }),
      ).rejects.toMatchObject({ code: 'PATH_UNSAFE' });
    });
  });

  it('rejects a budget that cannot fit the header', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'ctx' });
      await expect(
        buildContext({ projectRoot: directory, budget: headerBudget() - 1 }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });
});
