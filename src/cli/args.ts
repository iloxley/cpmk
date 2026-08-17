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
  | { kind: 'doctor'; root?: string; json: boolean }
  | { kind: 'show'; root?: string; id: string; json: boolean }
  | {
      kind: 'edit';
      root?: string;
      id: string;
      title?: string;
      content?: string;
      type?: string;
      tags?: string[];
    }
  | { kind: 'archive'; root?: string; id: string }
  | {
      kind: 'supersede';
      root?: string;
      id: string;
      content: string;
      title?: string;
      type?: string;
      tags: string[];
    }
  | { kind: 'import'; root?: string; sourcePath: string }
  | {
      kind: 'export';
      root?: string;
      output?: string;
      status?: string;
      type?: string;
      tag?: string;
    }
  | { kind: 'migrate'; root?: string; to?: number; dryRun: boolean }
  | { kind: 'status'; root?: string }
  | { kind: 'handoff'; root?: string; summary?: string }
  | { kind: 'hook'; root?: string; action: 'install' | 'uninstall' }
  | { kind: 'session-start'; root?: string; title?: string }
  | { kind: 'session-status'; root?: string; json: boolean }
  | { kind: 'session-end'; root?: string; summary?: string }
  | { kind: 'session-resume'; root?: string; summary?: string };

const COMMANDS = new Set([
  'init',
  'remember',
  'list',
  'context',
  'doctor',
  'show',
  'edit',
  'archive',
  'supersede',
  'import',
  'export',
  'migrate',
  'status',
  'handoff',
  'hook',
  'session',
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
        content: { type: 'string' },
        to: { type: 'string' },
        'dry-run': { type: 'boolean' },
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
    case 'show': {
      const id = parsed.positionals[0];
      if (id === undefined || parsed.positionals.length !== 1) {
        throw usageError('show requires a single <id> argument');
      }
      return {
        kind: 'show',
        id,
        json: parsed.values.json === true,
        ...optionalRoot(root),
      };
    }
    case 'edit': {
      const id = parsed.positionals[0];
      if (id === undefined || parsed.positionals.length !== 1) {
        throw usageError('edit requires a single <id> argument');
      }
      const title = optionalString(parsed.values.title, '--title');
      const content = optionalString(parsed.values.content, '--content');
      const type = optionalString(parsed.values.type, '--type');
      const tags = parsed.values.tag;
      return {
        kind: 'edit',
        id,
        ...optionalRoot(root),
        ...(title === undefined ? {} : { title }),
        ...(content === undefined ? {} : { content }),
        ...(type === undefined ? {} : { type }),
        ...(tags === undefined ? {} : { tags }),
      };
    }
    case 'archive': {
      const id = parsed.positionals[0];
      if (id === undefined || parsed.positionals.length !== 1) {
        throw usageError('archive requires a single <id> argument');
      }
      return { kind: 'archive', id, ...optionalRoot(root) };
    }
    case 'supersede': {
      const id = parsed.positionals[0];
      const content = parsed.positionals[1];
      if (
        id === undefined ||
        content === undefined ||
        parsed.positionals.length !== 2
      ) {
        throw usageError('supersede requires <id> and <content>');
      }
      const title = optionalString(parsed.values.title, '--title');
      const type = optionalString(parsed.values.type, '--type');
      return {
        kind: 'supersede',
        id,
        content,
        tags: parsed.values.tag ?? [],
        ...optionalRoot(root),
        ...(title === undefined ? {} : { title }),
        ...(type === undefined ? {} : { type }),
      };
    }
    case 'import': {
      const sourcePath = parsed.positionals[0];
      if (sourcePath === undefined || parsed.positionals.length !== 1) {
        throw usageError('import requires a single <path> argument');
      }
      return { kind: 'import', sourcePath, ...optionalRoot(root) };
    }
    case 'export': {
      if (parsed.positionals.length > 0) {
        throw usageError('export does not take positional arguments');
      }
      const output = optionalString(parsed.values.output, '--output');
      const status = optionalString(parsed.values.status, '--status');
      const type = optionalString(parsed.values.type, '--type');
      const tags = parsed.values.tag ?? [];
      if (tags.length > 1) {
        throw usageError('export accepts a single --tag filter');
      }
      const tag = optionalString(tags[0], '--tag');
      return {
        kind: 'export',
        ...optionalRoot(root),
        ...(output === undefined ? {} : { output }),
        ...(status === undefined ? {} : { status }),
        ...(type === undefined ? {} : { type }),
        ...(tag === undefined ? {} : { tag }),
      };
    }
    case 'migrate': {
      if (parsed.positionals.length > 0) {
        throw usageError('migrate does not take positional arguments');
      }
      const toValue = parsed.values.to;
      const to =
        toValue === undefined
          ? undefined
          : /^[0-9]+$/u.test(toValue)
            ? Number.parseInt(toValue, 10)
            : undefined;
      if (toValue !== undefined && to === undefined) {
        throw usageError('--to must be an integer schema version');
      }
      return {
        kind: 'migrate',
        dryRun: parsed.values['dry-run'] === true,
        ...optionalRoot(root),
        ...(to === undefined ? {} : { to }),
      };
    }
    case 'status':
      if (parsed.positionals.length > 0) {
        throw usageError('status does not take positional arguments');
      }
      return { kind: 'status', ...optionalRoot(root) };
    case 'handoff': {
      const summary = parsed.positionals[0];
      if (parsed.positionals.length > 1) {
        throw usageError('handoff accepts an optional summary only');
      }
      return {
        kind: 'handoff',
        ...optionalRoot(root),
        ...(summary === undefined ? {} : { summary }),
      };
    }
    case 'session': {
      const action = parsed.positionals[0];
      if (action === 'start') {
        if (parsed.positionals.length !== 1) {
          throw usageError('session start does not take extra arguments');
        }
        const title = optionalString(parsed.values.title, '--title');
        return {
          kind: 'session-start',
          ...optionalRoot(root),
          ...(title === undefined ? {} : { title }),
        };
      }
      if (action === 'status') {
        if (parsed.positionals.length !== 1) {
          throw usageError('session status does not take extra arguments');
        }
        return {
          kind: 'session-status',
          json: parsed.values.json === true,
          ...optionalRoot(root),
        };
      }
      if (action === 'end') {
        if (parsed.positionals.length > 2) {
          throw usageError('session end accepts an optional summary only');
        }
        const summary = parsed.positionals[1];
        return {
          kind: 'session-end',
          ...optionalRoot(root),
          ...(summary === undefined ? {} : { summary }),
        };
      }
      if (action === 'resume') {
        if (parsed.positionals.length > 2) {
          throw usageError('session resume accepts an optional summary only');
        }
        const summary = parsed.positionals[1];
        return {
          kind: 'session-resume',
          ...optionalRoot(root),
          ...(summary === undefined ? {} : { summary }),
        };
      }
      throw usageError('session requires start, status, end, or resume');
    }
    case 'hook': {
      const action = parsed.positionals[0];
      if (action !== 'install' && action !== 'uninstall') {
        throw usageError('hook requires install or uninstall');
      }
      if (parsed.positionals.length !== 1) {
        throw usageError('hook requires install or uninstall');
      }
      return { kind: 'hook', action, ...optionalRoot(root) };
    }
    default:
      throw usageError(`unknown command ${first}; see cpmk --help`);
  }
}
