export const VERSION_SOURCE = '0.1.0';

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
    default:
      return `CPMK — Cursor Project Memory Kit

Usage:
  cpmk <command> [options]

Commands:
  init        Create local CPMK project state
  remember    Store a memory entry
  list        List memory entries
  context     Assemble a bounded Markdown context document
  doctor      Validate project state

Global options:
  --root <path>   Project directory (default: current working directory)
  --help          Show help
  --version       Show version
`;
  }
}
