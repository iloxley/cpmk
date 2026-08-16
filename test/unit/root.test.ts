import { mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/application/init.js';
import { discoverRoot, safeResolve } from '../../src/storage/root.js';
import { real, withTempDir } from '../helpers/temp.js';

describe('root discovery', () => {
  it('walks upward to the nearest config.json', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'nested' });
      const nested = path.join(directory, 'a', 'b');
      await mkdir(nested, { recursive: true });
      await expect(discoverRoot(nested)).resolves.toBe(await real(directory));
    });
  });

  it('does not invent a root when none exists', async () => {
    await withTempDir(async (directory) => {
      await expect(discoverRoot(directory)).rejects.toMatchObject({
        code: 'PROJECT_NOT_FOUND',
        exitCode: 2,
      });
    });
  });

  it('supports Unicode directory names', async () => {
    await withTempDir(async (directory) => {
      const unicodeRoot = path.join(directory, '项目-память');
      await mkdir(unicodeRoot);
      await initProject({ root: unicodeRoot, name: 'unicode' });
      await mkdir(path.join(unicodeRoot, 'src'));
      await expect(discoverRoot(path.join(unicodeRoot, 'src'))).resolves.toBe(
        await real(unicodeRoot),
      );
    });
  });
});

describe('safeResolve', () => {
  it('rejects symlink escapes when the platform allows symlink creation', async () => {
    await withTempDir(async (directory) => {
      const project = path.join(directory, 'project');
      await mkdir(project);
      await initProject({ root: project, name: 'links' });
      const outside = path.join(directory, 'outside.txt');
      await writeFile(outside, 'secret');
      const link = path.join(project, 'escape.md');
      try {
        await symlink(outside, link);
      } catch {
        return;
      }
      await expect(safeResolve(project, link)).rejects.toMatchObject({
        code: 'PATH_UNSAFE',
      });
    });
  });

  it('rejects output paths that walk above the root', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'escape' });
      await expect(
        safeResolve(directory, path.join(directory, '..', 'outside.md')),
      ).rejects.toMatchObject({ code: 'PATH_UNSAFE' });
    });
  });
});
