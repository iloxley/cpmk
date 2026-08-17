import path from 'node:path';
import { wrapGeneratedContext, renderCursorRule } from '../domain/cursor.js';
import { renderContext } from '../domain/render.js';
import { selectEntries } from '../domain/selection.js';
import { writeAtomicFile } from '../storage/atomic.js';
import { nodeFs, type FsOps } from '../storage/fs-ops.js';
import { generatedDir } from '../storage/paths.js';
import { safeResolve } from '../storage/root.js';
import { ProjectStore } from '../storage/store.js';

export interface CursorGenerateResult {
  written: string[];
}

function defaultCursorDir(projectRoot: string): string {
  return path.join(generatedDir(projectRoot), 'cursor');
}

export async function generateCursorArtifacts(options: {
  projectRoot: string;
  budget?: number;
  output?: string;
  fs?: FsOps;
}): Promise<CursorGenerateResult> {
  const ops = options.fs ?? nodeFs;
  const store = new ProjectStore(options.projectRoot, ops);
  const config = await store.readConfig();
  const entries = (await store.readAllEntries()).filter(
    (entry) => entry.status === 'active',
  );
  const budget = options.budget ?? config.context.defaultBudget;
  const selected = selectEntries(entries, budget);
  const contextMarkdown = wrapGeneratedContext(renderContext(selected));
  const ruleMarkdown = renderCursorRule(entries);

  const output = options.output;
  const targets: { path: string; contents: string }[] = [];
  if (output === undefined) {
    const directory = defaultCursorDir(options.projectRoot);
    targets.push(
      { path: path.join(directory, 'cpmk.mdc'), contents: ruleMarkdown },
      { path: path.join(directory, 'context.md'), contents: contextMarkdown },
    );
  } else if (output.endsWith('.mdc')) {
    targets.push({
      path: path.resolve(options.projectRoot, output),
      contents: ruleMarkdown,
    });
  } else if (output.endsWith('.md')) {
    targets.push({
      path: path.resolve(options.projectRoot, output),
      contents: contextMarkdown,
    });
  } else {
    const directory = path.resolve(options.projectRoot, output);
    targets.push(
      { path: path.join(directory, 'cpmk.mdc'), contents: ruleMarkdown },
      { path: path.join(directory, 'context.md'), contents: contextMarkdown },
    );
  }

  const written: string[] = [];
  for (const target of targets) {
    const resolved = await safeResolve(options.projectRoot, target.path, ops);
    await ops.mkdir(path.dirname(resolved), { recursive: true });
    await writeAtomicFile(resolved, target.contents, ops);
    written.push(resolved);
  }
  return { written };
}
