import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/application/init.js';
import { parseConfig } from '../../src/domain/validate.js';
import { nodeFs, pathExists, type FsOps } from '../../src/storage/fs-ops.js';
import { configPath } from '../../src/storage/paths.js';
import { real, withTempDir } from '../helpers/temp.js';

describe('initProject', () => {
  it('creates the required tree and derives the project name', async () => {
    await withTempDir(async (directory) => {
      const named = path.join(directory, 'demo');
      await mkdir(named);
      const result = await initProject({ root: named });
      expect(result.root).toBe(await real(named));
      const raw = await readFile(configPath(named), 'utf8');
      const config = parseConfig(raw, 'config.json');
      expect(config.project.name).toBe('demo');
      expect(config.schemaVersion).toBe(1);
      expect(
        await pathExists(nodeFs, path.join(named, '.cpmk/memory/.gitkeep')),
      ).toBe(true);
      expect(
        await pathExists(nodeFs, path.join(named, '.cpmk/generated/.gitkeep')),
      ).toBe(true);
    });
  });

  it('refuses to overwrite an existing .cpmk directory', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'once' });
      await expect(
        initProject({ root: directory, name: 'twice' }),
      ).rejects.toMatchObject({
        code: 'ALREADY_INITIALIZED',
      });
    });
  });

  it('rolls back a partial initialization', async () => {
    await withTempDir(async (directory) => {
      const ops: FsOps = {
        ...nodeFs,
        open: async (target, flags) => {
          if (target.includes('config.json')) {
            throw new Error('injected config write failure');
          }
          return nodeFs.open(target, flags);
        },
      };
      await expect(
        initProject({ root: directory, name: 'rollback', fs: ops }),
      ).rejects.toThrow();
      expect(await pathExists(nodeFs, path.join(directory, '.cpmk'))).toBe(
        false,
      );
    });
  });

  it('does not treat a file named config.json outside .cpmk as state', async () => {
    await withTempDir(async (directory) => {
      await writeFile(path.join(directory, 'config.json'), '{}');
      await initProject({ root: directory, name: 'ok' });
      expect(
        await pathExists(nodeFs, path.join(directory, '.cpmk/config.json')),
      ).toBe(true);
    });
  });
});
