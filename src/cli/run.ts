import path from 'node:path';
import { buildContext } from '../application/context.js';
import { diagnoseProject } from '../application/doctor.js';
import { initProject } from '../application/init.js';
import { listMemory } from '../application/list.js';
import { rememberEntry } from '../application/remember.js';
import { CpmkError } from '../domain/errors.js';
import { discoverRoot, resolveExistingDirectory } from '../storage/root.js';
import { parseCli } from './args.js';
import {
  formatDoctorHuman,
  formatDoctorJson,
  formatListHuman,
  formatListJson,
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
    }
  } catch (error) {
    io.stderr(formatUnexpected(error));
    return exitCodeFor(error);
  }
}
