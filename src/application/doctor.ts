import path from 'node:path';
import { filenameForId } from '../domain/entry.js';
import {
  ID_PATTERN,
  type Diagnostic,
  type DoctorResult,
  type MemoryEntry,
} from '../domain/types.js';
import { parseConfig, parseEntry } from '../domain/validate.js';
import { nodeFs, pathExists, type FsOps } from '../storage/fs-ops.js';
import {
  configPath,
  cpmkDir,
  displayPath,
  generatedDir,
  memoryDir,
} from '../storage/paths.js';
import { assertSafeProjectLayout } from '../storage/root.js';
import { readGitSnapshot } from '../git/status.js';

const SKIP_MEMORY_FILES = new Set(['.gitkeep']);

function addError(
  diagnostics: Diagnostic[],
  code: string,
  filePath: string,
  message: string,
): void {
  diagnostics.push({ severity: 'error', code, path: filePath, message });
}

function addWarning(
  diagnostics: Diagnostic[],
  code: string,
  filePath: string,
  message: string,
): void {
  diagnostics.push({ severity: 'warning', code, path: filePath, message });
}

export async function diagnoseProject(options: {
  projectRoot: string;
  fs?: FsOps;
}): Promise<DoctorResult> {
  const ops = options.fs ?? nodeFs;
  const root = options.projectRoot;
  const diagnostics: Diagnostic[] = [];
  const seenIds = new Map<string, string>();
  let entryCount = 0;

  try {
    await assertSafeProjectLayout(root, ops);
  } catch (error) {
    addError(
      diagnostics,
      'PATH_UNSAFE',
      displayPath(root, cpmkDir(root)),
      error instanceof Error ? error.message : 'project layout is unsafe',
    );
  }

  const projectDir = cpmkDir(root);
  if (!(await pathExists(ops, projectDir))) {
    addError(
      diagnostics,
      'MISSING_LAYOUT',
      displayPath(root, projectDir),
      'missing .cpmk directory; run cpmk init',
    );
  } else {
    const info = await ops.lstat(projectDir);
    if (!info.isDirectory()) {
      addError(
        diagnostics,
        'MISSING_LAYOUT',
        displayPath(root, projectDir),
        '.cpmk must be a directory',
      );
    }
  }

  const configFile = configPath(root);
  if (!(await pathExists(ops, configFile))) {
    addError(
      diagnostics,
      'MISSING_CONFIG',
      displayPath(root, configFile),
      'missing config.json; run cpmk init or restore the file',
    );
  } else {
    try {
      const raw = await ops.readFile(await ops.realpath(configFile));
      parseConfig(raw, displayPath(root, configFile));
    } catch (error) {
      addError(
        diagnostics,
        'INVALID_CONFIG',
        displayPath(root, configFile),
        error instanceof Error ? error.message : 'config.json is invalid',
      );
    }
  }

  for (const [directory, label] of [
    [memoryDir(root), 'memory'] as const,
    [generatedDir(root), 'generated'] as const,
  ]) {
    if (!(await pathExists(ops, directory))) {
      addError(
        diagnostics,
        'MISSING_LAYOUT',
        displayPath(root, directory),
        `missing ${label} directory; recreate it under .cpmk`,
      );
    }
  }

  if (await pathExists(ops, memoryDir(root))) {
    const names = await ops.readdir(memoryDir(root));
    for (const name of names.sort()) {
      if (SKIP_MEMORY_FILES.has(name)) {
        continue;
      }
      const absolute = path.join(memoryDir(root), name);
      const relative = displayPath(root, absolute);
      if (!name.endsWith('.json')) {
        addError(
          diagnostics,
          'UNEXPECTED_FILE',
          relative,
          'memory files must use the <id>.json name; remove or rename this file',
        );
        continue;
      }

      const idFromName = name.slice(0, -'.json'.length);
      if (!ID_PATTERN.test(idFromName)) {
        addError(
          diagnostics,
          'INVALID_FILENAME',
          relative,
          'filename must be a 26-character ULID plus .json',
        );
      }

      let entry: MemoryEntry;
      try {
        const raw = await ops.readFile(absolute);
        entry = parseEntry(raw, relative);
      } catch (error) {
        addError(
          diagnostics,
          'INVALID_ENTRY',
          relative,
          error instanceof Error ? error.message : 'memory entry is invalid',
        );
        continue;
      }

      entryCount += 1;
      if (entry.id !== idFromName) {
        addError(
          diagnostics,
          'ID_MISMATCH',
          relative,
          `filename must equal ${filenameForId(entry.id)}`,
        );
      }
      const previous = seenIds.get(entry.id);
      if (previous !== undefined) {
        addError(
          diagnostics,
          'DUPLICATE_ID',
          relative,
          `duplicate id also found in ${previous}`,
        );
      } else {
        seenIds.set(entry.id, relative);
      }
    }
  }

  const git = readGitSnapshot(root);
  if (git?.dirty === true) {
    addWarning(
      diagnostics,
      'DIRTY_TREE',
      '.',
      `Git worktree is dirty on ${git.branch}; commit or stash before a handoff`,
    );
  }

  return {
    ok: !diagnostics.some((item) => item.severity === 'error'),
    data: {
      root,
      entryCount,
      diagnosticCount: diagnostics.length,
    },
    diagnostics,
  };
}
