import { rankSearchResults, type ScoredEntry } from '../domain/search.js';
import { listMemory } from './list.js';
import type { FsOps } from '../storage/fs-ops.js';

export async function searchMemory(options: {
  projectRoot: string;
  query: string;
  type?: string;
  tag?: string;
  status?: string;
  fs?: FsOps;
}): Promise<ScoredEntry[]> {
  const entries = await listMemory({
    projectRoot: options.projectRoot,
    ...(options.type === undefined ? {} : { type: options.type }),
    ...(options.tag === undefined ? {} : { tag: options.tag }),
    ...(options.status === undefined ? {} : { status: options.status }),
    ...(options.fs === undefined ? {} : { fs: options.fs }),
  });
  return rankSearchResults(entries, options.query);
}
