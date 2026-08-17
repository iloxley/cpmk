import path from 'node:path';
import { generateCursorArtifacts } from '../application/cursor.js';
import { startDashboard } from '../application/dashboard.js';
import {
  endSession,
  resumeSession,
  sessionStatus,
  startSession,
} from '../application/session.js';
import { createHandoff } from '../application/handoff.js';
import { installHooks, uninstallHooks } from '../application/hook.js';
import { readProjectStatus } from '../application/status.js';
import { archiveEntry } from '../application/archive.js';
import { buildContext } from '../application/context.js';
import { diagnoseProject } from '../application/doctor.js';
import { editEntry } from '../application/edit.js';
import { exportMemory } from '../application/export-memory.js';
import { importMemory } from '../application/import-memory.js';
import { initProject } from '../application/init.js';
import { listMemory } from '../application/list.js';
import { migrateProject } from '../application/migrate.js';
import { rememberEntry } from '../application/remember.js';
import { showEntry } from '../application/show.js';
import { supersedeEntry } from '../application/supersede.js';
import { CpmkError } from '../domain/errors.js';
import { discoverRoot, resolveExistingDirectory } from '../storage/root.js';
import { parseCli } from './args.js';
import {
  formatDoctorHuman,
  formatDoctorJson,
  formatListHuman,
  formatListJson,
  formatSessionStatusHuman,
  formatSessionStatusJson,
  formatShowHuman,
  formatShowJson,
} from './format.js';
import { helpText, VERSION_SOURCE } from './help.js';

export interface CliIo {
  stdout(text: string): void;
  stderr(text: string): void;
  cwd(): string;
}

export const processIo: CliIo = {
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
  cwd: () => process.cwd(),
};

function startDirectory(root: string | undefined, cwd: string): string {
  return root === undefined ? cwd : path.resolve(cwd, root);
}

async function projectRoot(
  root: string | undefined,
  cwd: string,
): Promise<string> {
  const start = startDirectory(root, cwd);
  const existing = await resolveExistingDirectory(start);
  return discoverRoot(existing);
}

export function formatUnexpected(error: unknown): string {
  if (error instanceof CpmkError) {
    return error.path === undefined
      ? `${error.message}\n`
      : `${error.path}: ${error.message}\n`;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = Reflect.get(error, 'code');
    if (typeof code === 'string') {
      return `internal error: ${code}\n`;
    }
  }
  return 'internal error\n';
}

export function exitCodeFor(error: unknown): number {
  if (error instanceof CpmkError) {
    return error.exitCode;
  }
  return 3;
}

export async function run(
  argv: readonly string[],
  io: CliIo = processIo,
): Promise<number> {
  try {
    const parsed = parseCli(argv);
    switch (parsed.kind) {
      case 'help':
        io.stdout(helpText(parsed.topic));
        return 0;
      case 'version':
        io.stdout(`${VERSION_SOURCE}\n`);
        return 0;
      case 'init': {
        const result = await initProject({
          root: startDirectory(parsed.root, io.cwd()),
          ...(parsed.name === undefined ? {} : { name: parsed.name }),
        });
        io.stdout(`${result.cpmkDir}\n`);
        return 0;
      }
      case 'remember': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entry = await rememberEntry({
          projectRoot: root,
          content: parsed.content,
          ...(parsed.title === undefined ? {} : { title: parsed.title }),
          ...(parsed.type === undefined ? {} : { type: parsed.type }),
          tags: parsed.tags,
        });
        io.stdout(`${entry.id}\n`);
        return 0;
      }
      case 'list': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entries = await listMemory({
          projectRoot: root,
          ...(parsed.type === undefined ? {} : { type: parsed.type }),
          ...(parsed.tag === undefined ? {} : { tag: parsed.tag }),
          ...(parsed.status === undefined ? {} : { status: parsed.status }),
        });
        io.stdout(
          parsed.json ? formatListJson(entries) : formatListHuman(entries),
        );
        return 0;
      }
      case 'context': {
        const root = await projectRoot(parsed.root, io.cwd());
        const result = await buildContext({
          projectRoot: root,
          ...(parsed.budget === undefined ? {} : { budget: parsed.budget }),
          ...(parsed.output === undefined
            ? {}
            : { output: path.resolve(io.cwd(), parsed.output) }),
        });
        if (result.writtenTo === undefined) {
          io.stdout(result.markdown);
        }
        const status = readProjectStatus(root);
        if (status.git?.dirty === true) {
          io.stderr(`warning: Git worktree is dirty on ${status.git.branch}\n`);
        }
        return 0;
      }
      case 'doctor': {
        const root = await projectRoot(parsed.root, io.cwd());
        const result = await diagnoseProject({ projectRoot: root });
        io.stdout(
          parsed.json ? formatDoctorJson(result) : formatDoctorHuman(result),
        );
        return result.ok ? 0 : 1;
      }
      case 'show': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entry = await showEntry({ projectRoot: root, id: parsed.id });
        io.stdout(parsed.json ? formatShowJson(entry) : formatShowHuman(entry));
        return 0;
      }
      case 'edit': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entry = await editEntry({
          projectRoot: root,
          id: parsed.id,
          ...(parsed.title === undefined ? {} : { title: parsed.title }),
          ...(parsed.content === undefined ? {} : { content: parsed.content }),
          ...(parsed.type === undefined ? {} : { type: parsed.type }),
          ...(parsed.tags === undefined ? {} : { tags: parsed.tags }),
        });
        io.stdout(`${entry.id}\n`);
        return 0;
      }
      case 'archive': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entry = await archiveEntry({ projectRoot: root, id: parsed.id });
        io.stdout(`${entry.id}\n`);
        return 0;
      }
      case 'supersede': {
        const root = await projectRoot(parsed.root, io.cwd());
        const result = await supersedeEntry({
          projectRoot: root,
          id: parsed.id,
          content: parsed.content,
          ...(parsed.title === undefined ? {} : { title: parsed.title }),
          ...(parsed.type === undefined ? {} : { type: parsed.type }),
          tags: parsed.tags,
        });
        io.stdout(`${result.next.id}\n`);
        return 0;
      }
      case 'import': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entries = await importMemory({
          projectRoot: root,
          sourcePath: path.resolve(io.cwd(), parsed.sourcePath),
        });
        io.stdout(`${entries.map((entry) => entry.id).join('\n')}\n`);
        return 0;
      }
      case 'export': {
        const root = await projectRoot(parsed.root, io.cwd());
        const result = await exportMemory({
          projectRoot: root,
          ...(parsed.output === undefined
            ? {}
            : { output: path.resolve(io.cwd(), parsed.output) }),
          ...(parsed.status === undefined ? {} : { status: parsed.status }),
          ...(parsed.type === undefined ? {} : { type: parsed.type }),
          ...(parsed.tag === undefined ? {} : { tag: parsed.tag }),
        });
        if (result.writtenTo === undefined) {
          io.stdout(`${JSON.stringify(result.entries)}\n`);
        }
        return 0;
      }
      case 'migrate': {
        const root = await projectRoot(parsed.root, io.cwd());
        const result = await migrateProject({
          projectRoot: root,
          dryRun: parsed.dryRun,
          ...(parsed.to === undefined ? {} : { to: parsed.to }),
        });
        const backup =
          result.backupDir === undefined ? 'none' : result.backupDir;
        io.stdout(
          `schema ${result.from} -> ${result.to}; entries ${result.entryCount}; backup ${backup}; dryRun ${result.dryRun}\n`,
        );
        return 0;
      }
      case 'status': {
        const root = await projectRoot(parsed.root, io.cwd());
        const status = readProjectStatus(root);
        if (status.git === undefined) {
          io.stdout(`Root: ${status.projectRoot}\nGit: unavailable\n`);
        } else {
          io.stdout(
            `Root: ${status.projectRoot}\nBranch: ${status.git.branch}\nCommit: ${status.git.commit}\nDirty: ${status.git.dirty ? 'yes' : 'no'}\n`,
          );
        }
        return 0;
      }
      case 'handoff': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entry = await createHandoff({
          projectRoot: root,
          ...(parsed.summary === undefined ? {} : { summary: parsed.summary }),
        });
        io.stdout(`${entry.id}\n`);
        return 0;
      }
      case 'session-start': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entry = await startSession({
          projectRoot: root,
          ...(parsed.title === undefined ? {} : { title: parsed.title }),
        });
        io.stdout(`${entry.id}\n`);
        return 0;
      }
      case 'session-status': {
        const root = await projectRoot(parsed.root, io.cwd());
        const data = await sessionStatus({ projectRoot: root });
        io.stdout(
          parsed.json
            ? formatSessionStatusJson(data)
            : formatSessionStatusHuman(data),
        );
        return 0;
      }
      case 'session-end': {
        const root = await projectRoot(parsed.root, io.cwd());
        const result = await endSession({
          projectRoot: root,
          ...(parsed.summary === undefined ? {} : { summary: parsed.summary }),
        });
        io.stdout(`${result.handoff.id}\n`);
        return 0;
      }
      case 'dashboard': {
        const root = await projectRoot(parsed.root, io.cwd());
        const server = await startDashboard({
          projectRoot: root,
          port: parsed.port,
        });
        io.stdout(`${server.url}\n`);
        await new Promise<void>((resolve) => {
          const stop = () => {
            void server.close().finally(() => {
              resolve();
            });
          };
          process.once('SIGINT', stop);
          process.once('SIGTERM', stop);
        });
        return 0;
      }
      case 'cursor-generate': {
        const root = await projectRoot(parsed.root, io.cwd());
        const result = await generateCursorArtifacts({
          projectRoot: root,
          ...(parsed.budget === undefined ? {} : { budget: parsed.budget }),
          ...(parsed.output === undefined
            ? {}
            : { output: path.resolve(io.cwd(), parsed.output) }),
        });
        io.stdout(`${result.written.join('\n')}\n`);
        return 0;
      }
      case 'session-resume': {
        const root = await projectRoot(parsed.root, io.cwd());
        const entry = await resumeSession({
          projectRoot: root,
          ...(parsed.summary === undefined ? {} : { summary: parsed.summary }),
        });
        io.stdout(`${entry.id}\n`);
        return 0;
      }
      case 'hook': {
        const root = await projectRoot(parsed.root, io.cwd());
        if (parsed.action === 'install') {
          const written = await installHooks(root);
          io.stdout(`${written.join('\n')}\n`);
        } else {
          const removed = await uninstallHooks(root);
          io.stdout(
            removed.length === 0
              ? 'no cpmk hooks removed\n'
              : `${removed.join('\n')}\n`,
          );
        }
        return 0;
      }
    }
  } catch (error) {
    io.stderr(formatUnexpected(error));
    return exitCodeFor(error);
  }
}
