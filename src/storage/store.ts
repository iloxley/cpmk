import path from 'node:path';
import { filenameForId } from '../domain/entry.js';
import { parseConfig, parseEntry } from '../domain/validate.js';
import { validationError } from '../domain/errors.js';
import type { CpmkConfig, MemoryEntry } from '../domain/types.js';
import { writeAtomicFile, serializeJson } from './atomic.js';
import { nodeFs, pathExists, type FsOps } from './fs-ops.js';
import {
  configPath,
  displayPath,
  entryPath,
  generatedDir,
  memoryDir,
} from './paths.js';
import { safeResolve } from './root.js';

const SKIP_MEMORY_FILES = new Set(['.gitkeep']);

export class ProjectStore {
  constructor(
    readonly root: string,
    private readonly ops: FsOps = nodeFs,
  ) {}

  async readConfig(): Promise<CpmkConfig> {
    const target = await safeResolve(
      this.root,
      configPath(this.root),
      this.ops,
    );
    const raw = await this.ops.readFile(target);
    return parseConfig(raw, displayPath(this.root, target));
  }

  async writeConfig(config: CpmkConfig): Promise<void> {
    const target = await safeResolve(
      this.root,
      configPath(this.root),
      this.ops,
    );
    await writeAtomicFile(target, serializeJson(config), this.ops);
  }

  async writeEntry(entry: MemoryEntry): Promise<void> {
    const target = await safeResolve(
      this.root,
      entryPath(this.root, entry.id),
      this.ops,
    );
    await writeAtomicFile(target, serializeJson(entry), this.ops);
  }

  async listMemoryFilenames(): Promise<string[]> {
    const directory = await safeResolve(
      this.root,
      memoryDir(this.root),
      this.ops,
    );
    const names = await this.ops.readdir(directory);
    return names.filter((name) => !SKIP_MEMORY_FILES.has(name)).sort();
  }

  async readEntry(id: string): Promise<MemoryEntry> {
    const target = await safeResolve(
      this.root,
      entryPath(this.root, id),
      this.ops,
    );
    const raw = await this.ops.readFile(target);
    const entry = parseEntry(raw, displayPath(this.root, target));
    if (entry.id !== id) {
      throw validationError(
        `entry id does not match filename ${filenameForId(id)}`,
        displayPath(this.root, target),
      );
    }
    return entry;
  }

  async readAllEntries(): Promise<MemoryEntry[]> {
    const names = await this.listMemoryFilenames();
    const entries: MemoryEntry[] = [];
    for (const name of names) {
      if (!name.endsWith('.json')) {
        throw validationError(
          'memory directory contains a non-JSON file; remove it or run cpmk doctor',
          displayPath(this.root, path.join(memoryDir(this.root), name)),
        );
      }
      const id = name.slice(0, -'.json'.length);
      entries.push(await this.readEntry(id));
    }
    return entries;
  }

  async ensureLayout(): Promise<void> {
    await this.ops.mkdir(memoryDir(this.root), { recursive: true });
    await this.ops.mkdir(generatedDir(this.root), { recursive: true });
  }
}

export { pathExists };
