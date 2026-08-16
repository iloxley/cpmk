import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeAtomicFile } from '../../src/storage/atomic.js';
import { nodeFs, type FsOps } from '../../src/storage/fs-ops.js';
import { withTempDir } from '../helpers/temp.js';

describe('writeAtomicFile', () => {
  it('replaces the target only after a successful write', async () => {
    await withTempDir(async (directory) => {
      const target = path.join(directory, 'entry.json');
      await writeAtomicFile(target, '{"ok":true}\n');
      expect(await readFile(target, 'utf8')).toBe('{"ok":true}\n');
    });
  });

  it('leaves an existing file intact when rename fails and removes the temp file', async () => {
    await withTempDir(async (directory) => {
      const target = path.join(directory, 'entry.json');
      await writeFile(target, 'original\n');
      const ops: FsOps = {
        ...nodeFs,
        rename: () => Promise.reject(new Error('injected rename failure')),
      };
      await expect(
        writeAtomicFile(target, 'updated\n', ops),
      ).rejects.toMatchObject({
        code: 'IO',
      });
      expect(await readFile(target, 'utf8')).toBe('original\n');
      const leftovers = await nodeFs.readdir(directory);
      expect(leftovers.filter((name) => name.endsWith('.tmp'))).toEqual([]);
    });
  });

  it('replaces an existing file on win32 after the first rename fails', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'win32' });
    try {
      await withTempDir(async (directory) => {
        const target = path.join(directory, 'entry.json');
        await writeFile(target, 'original\n');
        let attempts = 0;
        const ops: FsOps = {
          ...nodeFs,
          rename: async (from, to) => {
            attempts += 1;
            if (attempts === 1) {
              throw new Error('EPERM');
            }
            await nodeFs.rename(from, to);
          },
        };
        await writeAtomicFile(target, 'updated\n', ops);
        expect(await readFile(target, 'utf8')).toBe('updated\n');
      });
    } finally {
      if (descriptor) {
        Object.defineProperty(process, 'platform', descriptor);
      }
    }
  });

  it('restores the backup when the win32 replacement rename fails', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'win32' });
    try {
      await withTempDir(async (directory) => {
        const target = path.join(directory, 'entry.json');
        await writeFile(target, 'original\n');
        let attempts = 0;
        const ops: FsOps = {
          ...nodeFs,
          rename: async (from, to) => {
            attempts += 1;
            if (attempts === 1 || attempts === 3) {
              throw new Error('EPERM');
            }
            await nodeFs.rename(from, to);
          },
        };
        await expect(
          writeAtomicFile(target, 'updated\n', ops),
        ).rejects.toMatchObject({ code: 'IO' });
        expect(await readFile(target, 'utf8')).toBe('original\n');
      });
    } finally {
      if (descriptor) {
        Object.defineProperty(process, 'platform', descriptor);
      }
    }
  });
});
