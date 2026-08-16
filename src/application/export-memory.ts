import { writeAtomicFile } from '../storage/atomic.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { safeResolve } from '../storage/root.js';
import { listMemory } from './list.js';
import type { MemoryEntry } from '../domain/types.js';

export interface ExportResult {
  entries: MemoryEntry[];
  writtenTo?: string;
}

export async function exportMemory(options: {
  projectRoot: string;
  output?: string;
  status?: string;
  type?: string;
  tag?: string;
  fs?: FsOps;
}): Promise<ExportResult> {
  const ops = options.fs ?? nodeFs;
  const entries = await listMemory({
    projectRoot: options.projectRoot,
    ...(options.status === undefined ? {} : { status: options.status }),
    ...(options.type === undefined ? {} : { type: options.type }),
    ...(options.tag === undefined ? {} : { tag: options.tag }),
    fs: ops,
  });
  if (options.output === undefined) {
    return { entries };
  }
  const target = await safeResolve(options.projectRoot, options.output, ops);
  await writeAtomicFile(target, `${JSON.stringify(entries, null, 2)}\n`, ops);
  return { entries, writtenTo: target };
}
