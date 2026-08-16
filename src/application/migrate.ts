import path from 'node:path';
import { usageError } from '../domain/errors.js';
import { SCHEMA_VERSION } from '../domain/types.js';
import { nodeFs, pathExists, type FsOps } from '../storage/fs-ops.js';
import { configPath, memoryDir } from '../storage/paths.js';
import { ProjectStore } from '../storage/store.js';

export interface MigrateResult {
  from: number;
  to: number;
  dryRun: boolean;
  backupDir?: string;
  entryCount: number;
  changed: boolean;
}

function stamp(now: Date): string {
  return now.toISOString().replaceAll(':', '').replaceAll('.', '');
}

export async function migrateProject(options: {
  projectRoot: string;
  to?: number;
  dryRun?: boolean;
  now?: Date;
  fs?: FsOps;
}): Promise<MigrateResult> {
  const targetVersion = options.to ?? SCHEMA_VERSION;
  if (targetVersion !== SCHEMA_VERSION) {
    throw usageError(
      `this release can migrate only to schemaVersion ${SCHEMA_VERSION}`,
    );
  }
  const ops = options.fs ?? nodeFs;
  const store = new ProjectStore(options.projectRoot, ops);
  await store.readConfig();
  const entries = await store.readAllEntries();
  const result: MigrateResult = {
    from: SCHEMA_VERSION,
    to: targetVersion,
    dryRun: options.dryRun === true,
    entryCount: entries.length,
    changed: false,
  };
  if (options.dryRun === true) {
    return result;
  }

  const backupDir = path.join(
    options.projectRoot,
    '.cpmk',
    'backups',
    stamp(options.now ?? new Date()),
  );
  await ops.mkdir(path.join(backupDir, 'memory'), { recursive: true });
  const config = configPath(options.projectRoot);
  if (await pathExists(ops, config)) {
    await ops.writeFile(
      path.join(backupDir, 'config.json'),
      await ops.readFile(config),
    );
  }
  for (const name of await store.listMemoryFilenames()) {
    const from = path.join(memoryDir(options.projectRoot), name);
    await ops.writeFile(
      path.join(backupDir, 'memory', name),
      await ops.readFile(from),
    );
  }
  return { ...result, backupDir };
}
