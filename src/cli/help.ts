import { CLI_VERSION } from '../domain/version.js';

export const VERSION_SOURCE = CLI_VERSION;

export function helpText(topic?: string): string {
  switch (topic) {
    case 'init':
      return `Usage: cpmk init [--root <path>] [--name <name>]

Create a .cpmk directory in the selected project root.
Refuses to run if .cpmk already exists.
`;
    case 'remember':
      return `Usage: cpmk remember <content> [--title <title>] [--type <type>] [--tag <tag>...]

Create an active manual memory entry and print its ID.
Default type is fact. Default title is the first content line, truncated to 80 characters.
`;
    case 'list':
      return `Usage: cpmk list [--type <type>] [--tag <tag>] [--status <status>] [--json]

List memory entries ordered by updatedAt descending, then ID ascending.
`;
    case 'context':
      return `Usage: cpmk context [--budget <characters>] [--output <path>]

Render active entries as Markdown under a character budget.
Writes to stdout unless --output is supplied.
`;
    case 'doctor':
      return `Usage: cpmk doctor [--json]

Validate configuration, layout, filenames, schemas, duplicate IDs, and timestamps.
`;
    case 'show':
      return `Usage: cpmk show <id> [--json]

Print one memory entry, including source, status, and timestamps.
`;
    case 'edit':
      return `Usage: cpmk edit <id> [--title <title>] [--content <content>] [--type <type>] [--tag <tag>...]

Update fields on an existing entry and bump updatedAt.
`;
    case 'archive':
      return `Usage: cpmk archive <id>

Set an entry status to archived.
`;
    case 'supersede':
      return `Usage: cpmk supersede <id> <content> [--title <title>] [--type <type>] [--tag <tag>...]

Mark an active entry superseded and create a replacement entry.
`;
    case 'import':
      return `Usage: cpmk import <path>

Import entries from a JSON file. Paths matching privacy.denyGlobs are rejected.
`;
    case 'export':
      return `Usage: cpmk export [--output <path>] [--type <type>] [--tag <tag>] [--status <status>]

Write matching entries as a JSON array to stdout or a project file.
`;
    case 'migrate':
      return `Usage: cpmk migrate [--to <version>] [--dry-run]

Create a backup and confirm schema compatibility. Schema 1 is the only target in this release.
`;
    case 'status':
      return `Usage: cpmk status

Show project root and Git branch/commit/dirty state when Git is available.
`;
    case 'handoff':
      return `Usage: cpmk handoff [summary]

Create a handoff memory entry. Includes Git branch and commit when available.
`;
    case 'hook':
      return `Usage: cpmk hook install|uninstall

Opt-in Git hooks that remind you to write a handoff. Refuses to overwrite foreign hooks.
`;
    case 'session':
      return `Usage:
  cpmk session start [--title <title>]
  cpmk session status [--json]
  cpmk session end [summary]
  cpmk session resume [summary]

Start, inspect, close, or resume a work session. Session state is a v1 task tagged session and session-open.
`;
    case 'cursor':
      return `Usage: cpmk cursor generate [--budget <characters>] [--output <path>]

Write Cursor-readable context and a project rule. Default output is .cpmk/generated/cursor/.
`;
    case 'dashboard':
      return `Usage: cpmk dashboard [--port <n>]

Start a loopback-only browser UI on 127.0.0.1. Default port is 7435.
`;
    case 'plugin':
      return `Usage:
  cpmk plugin list [--json]
  cpmk plugin install <path>
  cpmk plugin uninstall <name>

Install manifest-only plugins under .cpmk/plugins. Core commands work with none installed.
`;
    case 'search':
      return `Usage: cpmk search <query> [--type <type>] [--tag <tag>] [--status <status>] [--json]

Rank memories with lexical search after the same filters as list. No embeddings or network.
`;
    case 'sync':
      return `Usage:
  cpmk sync preview --from <path> | --ref <git-ref> [--json]
  cpmk sync apply --from <path> | --ref <git-ref> [--json]
  cpmk sync status [--json]
  cpmk sync resolve <id> --keep local|incoming

Merge memory from another project or Git ref. Divergent ids become generated conflicts.
`;
    default:
      return `CPMK — Cursor Project Memory Kit

Usage:
  cpmk <command> [options]

Commands:
  init        Create local CPMK project state
  remember    Store a memory entry
  list        List memory entries
  show        Show one memory entry
  edit        Edit an existing entry
  archive     Archive an entry
  supersede   Replace an active entry
  import      Import entries from a JSON file
  export      Export entries as JSON
  context     Assemble a bounded Markdown context document
  doctor      Validate project state
  migrate     Backup project state and check schema version
  status      Show Git branch, commit, and dirty state
  handoff     Record a branch-aware handoff entry
  hook        Install or remove opt-in Git reminder hooks
  session     Start, status, end, or resume a work session
  cursor      Generate Cursor context and project rules
  dashboard   Open a loopback-only local memory UI
  sync        Preview, apply, and resolve memory merges
  search      Lexical search over memory entries
  plugin      List, install, or remove manifest plugins

Global options:
  --root <path>   Project directory (default: current working directory)
  --help          Show help
  --version       Show version
`;
  }
}
