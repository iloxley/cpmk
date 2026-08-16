import {
  access,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import type { Stats } from 'node:fs';

export interface WritableHandle {
  writeFile(contents: string, encoding: BufferEncoding): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
}

export interface FsOps {
  access(target: string): Promise<void>;
  realpath(target: string): Promise<string>;
  stat(target: string): Promise<Stats>;
  lstat(target: string): Promise<Stats>;
  readdir(target: string): Promise<string[]>;
  readFile(target: string): Promise<string>;
  mkdir(target: string, options?: { recursive?: boolean }): Promise<void>;
  rm(
    target: string,
    options: { recursive: boolean; force: boolean },
  ): Promise<void>;
  open(target: string, flags: string): Promise<WritableHandle>;
  rename(from: string, to: string): Promise<void>;
  unlink(target: string): Promise<void>;
  writeFile(target: string, contents: string): Promise<void>;
}

export const nodeFs: FsOps = {
  access: async (target) => {
    await access(target);
  },
  realpath,
  stat,
  lstat,
  readdir,
  readFile: async (target) => await readFile(target, 'utf8'),
  mkdir: async (target, options) => {
    await mkdir(target, options);
  },
  rm,
  open,
  rename,
  unlink,
  writeFile: async (target, contents) => {
    await writeFile(target, contents, 'utf8');
  },
};

export async function pathExists(ops: FsOps, target: string): Promise<boolean> {
  try {
    await ops.access(target);
    return true;
  } catch {
    return false;
  }
}
