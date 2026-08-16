import { parseArgs } from 'node:util';
import { usageError } from '../domain/errors.js';

export type ParsedCli =
  | { kind: 'help'; topic?: string }
  | { kind: 'version' }
  | { kind: 'init'; root?: string; name?: string }
  | {
      kind: 'remember';
      root?: string;
      content: string;
      title?: string;
      type?: string;
      tags: string[];
    }
  | {
      kind: 'list';
      root?: string;
      type?: string;
      tag?: string;
      status?: string;
      json: boolean;
    }
  | { kind: 'context'; root?: string; budget?: number; output?: string }
  | { kind: 'doctor'; root?: string; json: boolean };

const COMMANDS = new Set([
  'init',
  'remember',
  'list',
  'context',
  'doctor',
  'help',
]);

function optionalString(
  value: string | undefined,
  name: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value.trim().length === 0) {
    throw usageError(`${name} must be a non-empty string`);
  }
  return value;
}

function parseBudget(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^[0-9]+$/u.test(value)) {
    throw usageError('budget must be a positive integer');
  }
  return Number.parseInt(value, 10);
}

function parseCommandArgs(command: string, args: string[]) {
  try {
    return parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        root: { type: 'string' },
        name: { type: 'string' },
        title: { type: 'string' },
        type: { type: 'string' },
        tag: { type: 'string', multiple: true },
        status: { type: 'string' },
        json: { type: 'boolean' },
        budget: { type: 'string' },
        output: { type: 'string', short: 'o' },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'invalid arguments';
    throw usageError(`${command}: ${message}`);
  }
}

function optionalRoot(
  root: string | undefined,
): { root: string } | Record<string, never> {
  const value = optionalString(root, '--root');
  return value === undefined ? {} : { root: value };
}

export function parseCli(argv: readonly string[]): ParsedCli {
  if (argv.length === 0) {
    throw usageError('missing command; see cpmk --help');
  }

  const [first, ...rest] = argv;
  if (first === undefined) {
    throw usageError('missing command; see cpmk --help');
  }

  if (first === '--help' || first === '-h') {
    return { kind: 'help' };
  }
  if (first === '--version' || first === '-v') {
    return { kind: 'version' };
  }
  if (first.startsWith('-')) {
    throw usageError(`unknown option ${first}; see cpmk --help`);
  }
  if (first === 'help') {
    return {
      kind: 'help',
      ...(rest[0] === undefined ? {} : { topic: rest[0] }),
    };
  }
  if (!COMMANDS.has(first)) {
    throw usageError(`unknown command ${first}; see cpmk --help`);
  }

  const parsed = parseCommandArgs(first, rest);
  if (parsed.values.help === true) {
    return { kind: 'help', topic: first };
  }

  const root = parsed.values.root;
  switch (first) {
    case 'init': {
      if (parsed.positionals.length > 0) {
        throw usageError('init does not take positional arguments');
      }
      const name = optionalString(parsed.values.name, '--name');
      return {
        kind: 'init',
        ...optionalRoot(root),
        ...(name === undefined ? {} : { name }),
      };
    }
    case 'remember': {
      const content = parsed.positionals[0];
      if (content === undefined || parsed.positionals.length !== 1) {
        throw usageError('remember requires a single <content> argument');
      }
      const title = optionalString(parsed.values.title, '--title');
      const type = optionalString(parsed.values.type, '--type');
      return {
        kind: 'remember',
        content,
        tags: parsed.values.tag ?? [],
        ...optionalRoot(root),
        ...(title === undefined ? {} : { title }),
        ...(type === undefined ? {} : { type }),
      };
    }
    case 'list': {
      if (parsed.positionals.length > 0) {
        throw usageError('list does not take positional arguments');
      }
      const tags = parsed.values.tag ?? [];
      if (tags.length > 1) {
        throw usageError('list accepts a single --tag filter');
      }
      const type = optionalString(parsed.values.type, '--type');
      const tag = optionalString(tags[0], '--tag');
      const status = optionalString(parsed.values.status, '--status');
      return {
        kind: 'list',
        json: parsed.values.json === true,
        ...optionalRoot(root),
        ...(type === undefined ? {} : { type }),
        ...(tag === undefined ? {} : { tag }),
        ...(status === undefined ? {} : { status }),
      };
    }
    case 'context': {
      if (parsed.positionals.length > 0) {
        throw usageError('context does not take positional arguments');
      }
      const budget = parseBudget(parsed.values.budget);
      const output = optionalString(parsed.values.output, '--output');
      return {
        kind: 'context',
        ...optionalRoot(root),
        ...(budget === undefined ? {} : { budget }),
        ...(output === undefined ? {} : { output }),
      };
    }
    case 'doctor':
      if (parsed.positionals.length > 0) {
        throw usageError('doctor does not take positional arguments');
      }
      return {
        kind: 'doctor',
        json: parsed.values.json === true,
        ...optionalRoot(root),
      };
    default:
      throw usageError(`unknown command ${first}; see cpmk --help`);
  }
}
