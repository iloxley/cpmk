import { renderContext } from '../domain/render.js';
import { selectEntries } from '../domain/selection.js';
import { writeAtomicFile } from '../storage/atomic.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { safeResolve } from '../storage/root.js';
import { ProjectStore } from '../storage/store.js';

export interface ContextResult {
  markdown: string;
  writtenTo?: string;
}

export async function buildContext(options: {
  projectRoot: string;
  budget?: number;
  output?: string;
  fs?: FsOps;
}): Promise<ContextResult> {
  const ops = options.fs ?? nodeFs;
  const store = new ProjectStore(options.projectRoot, ops);
  const config = await store.readConfig();
  const entries = (await store.readAllEntries()).filter(
    (entry) => entry.status === 'active',
  );
  const budget = options.budget ?? config.context.defaultBudget;
  const selected = selectEntries(entries, budget);
  const markdown = renderContext(selected);

  if (options.output === undefined) {
    return { markdown };
  }

  const target = await safeResolve(options.projectRoot, options.output, ops);
  await writeAtomicFile(target, markdown, ops);
  return { markdown, writtenTo: target };
}
