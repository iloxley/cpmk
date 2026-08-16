# CPMK Technical Specification

## 1. Purpose

CPMK stores durable project memory and assembles a bounded context document for AI coding tools. This specification is normative unless an accepted architecture decision record (ADR) supersedes it.

## 2. Product requirements

### 2.1 Functional

- Initialize CPMK in a Git or ordinary project directory.
- Create, validate, list, and render memory entries.
- Keep project state human-readable and diff-friendly.
- Assemble deterministic context under a caller-supplied character budget.
- Exclude secrets and ignored paths by default.
- Add Git, session, editor, dashboard, synchronization, semantic retrieval, and plugin capabilities incrementally.

### 2.2 Quality attributes

- **Safety:** never overwrite an existing configuration without explicit consent.
- **Portability:** Linux, macOS, and Windows; no shell-specific runtime behavior.
- **Determinism:** the same files and options produce byte-identical output.
- **Performance:** Milestone 1 commands complete within 250 ms at p95 for 1,000 entries on a typical developer laptop, excluding process startup variance.
- **Compatibility:** version every persisted schema; reject unsupported major versions with a useful recovery message.
- **Observability:** errors identify the affected file and remediation without exposing file contents unnecessarily.

## 3. Milestone 1 normative scope

### 3.1 Technology baseline

- Node.js 22 or newer.
- TypeScript in strict mode, ECMAScript modules.
- npm package manager and lockfile.
- A lightweight argument parser and schema validator are permitted dependencies.
- Vitest for automated tests and ESLint plus Prettier for consistency.
- Do not add a database, network dependency, daemon, framework, telemetry, embeddings, or editor API.

### 3.2 Project state

`cpmk init` creates the following structure in the selected project root:

```text
.cpmk/
├── config.json
├── memory/
│   └── .gitkeep
└── generated/
    └── .gitkeep
```

`config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/cpmk/cpmk/main/schemas/config.schema.json",
  "schemaVersion": 1,
  "project": { "name": "example" },
  "context": { "defaultBudget": 12000 },
  "privacy": { "denyGlobs": ["**/.env*", "**/*secret*", "**/*credential*"] }
}
```

The implementation must not depend on the remote schema URL being reachable. The URL is metadata; validation uses the bundled schema.

### 3.3 Memory entry format

Each entry is a UTF-8 JSON file at `.cpmk/memory/<id>.json`:

```json
{
  "schemaVersion": 1,
  "id": "01JEXAMPLE0000000000000000",
  "type": "decision",
  "title": "Use SQLite later, not in core",
  "content": "Milestone 1 stores one JSON file per memory entry.",
  "tags": ["architecture", "storage"],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "source": "manual",
  "status": "active"
}
```

Rules:

- `id`: monotonic ULID; filename must equal `<id>.json`.
- `type`: `fact | decision | convention | task | handoff | warning`.
- `title`: 1–120 Unicode characters after trimming.
- `content`: 1–20,000 Unicode characters after trimming.
- `tags`: at most 20 unique lowercase strings matching `[a-z0-9][a-z0-9-]{0,39}`; sort on write.
- timestamps: UTC ISO 8601 strings; `updatedAt` cannot precede `createdAt`.
- `source`: `manual | import | system`.
- `status`: `active | superseded | archived`.
- Unknown properties are rejected in schema version 1.

Writes must be atomic: write a sibling temporary file, flush/close it, then rename it. A failed write must not corrupt an existing entry.

### 3.4 Root discovery

Commands begin at `--root`, if supplied, otherwise the current working directory. Walk upward to the nearest directory containing `.cpmk/config.json`. `init` uses the supplied/current directory and does not walk upward. Commands that require state exit with code 2 if no root is found.

### 3.5 Commands

#### `cpmk init [--root <path>] [--name <name>]`

Create valid initial state. Derive the name from the directory basename when omitted. Refuse if `.cpmk` already exists; do not partially initialize. Print the initialized absolute path.

#### `cpmk remember <content> [--title <title>] [--type <type>] [--tag <tag>...]`

Create an active manual entry. Default type is `fact`; default title is the first content line truncated safely to 80 characters. Print the ID. Reject content that matches a configured deny glob only when content is being imported from a path; literal manual text is not scanned in Milestone 1.

#### `cpmk list [--type <type>] [--tag <tag>] [--status <status>] [--json]`

List entries ordered by `updatedAt` descending, then ID ascending. Human output includes ID, type, title, and updated date. JSON output is a JSON array on stdout with no decoration.

#### `cpmk context [--budget <characters>] [--output <path>]`

Render active entries as Markdown. Order types: `warning`, `decision`, `convention`, `handoff`, `task`, `fact`; within a type order by `updatedAt` descending then ID ascending. Include complete entries only—never truncate an entry. Skip entries that do not fit. The header and trailing newline count toward the budget. Reject budgets too small for the fixed header. If `--output` is omitted, write to stdout; otherwise write atomically beneath the project root. Paths escaping the root are rejected.

Rendered form:

```markdown
# CPMK Project Context

## Decisions

### Use SQLite later, not in core
Milestone 1 stores one JSON file per memory entry.

Tags: `architecture`, `storage`
```

#### `cpmk doctor [--json]`

Validate configuration, directory layout, filenames, entry schemas, duplicate IDs, and timestamps. Human output summarizes pass/fail and actionable diagnostics. JSON output follows the result envelope below. Exit 0 when healthy and 1 when invalid.

### 3.6 Process interface

- stdout contains successful command results only.
- stderr contains diagnostics.
- Exit codes: `0` success, `1` validation/operational error, `2` usage or missing-project error, `3` unexpected internal error.
- `--json` commands use `{ "ok": boolean, "data": ..., "diagnostics": [...] }` where applicable; `list --json` is the explicitly documented array exception.
- No ANSI color when stdout is not a TTY or `NO_COLOR` is set.

### 3.7 Security

- Resolve and verify paths before reading or writing.
- Never follow a generated output path outside the project root.
- Do not log stored content in errors.
- Treat symlinks crossing the project boundary as unsafe and reject them.
- Never execute memory content.
- Collect no telemetry.

### 3.8 Milestone 1 acceptance criteria

- All five commands meet the behavior above.
- Unit tests cover schemas, ordering, budget selection, root discovery, and path safety.
- Integration tests run the packaged CLI in temporary directories.
- Tests cover initialization rollback and atomic-write failure behavior.
- Windows, macOS, and Linux CI run typecheck, lint, unit/integration tests, and build.
- `npm pack` produces an installable package with executable `cpmk` binary.
- Public functions and CLI behavior are documented; no later-milestone placeholders run at runtime.
- Coverage thresholds: 90% lines/functions/statements and 85% branches for core modules.

## 4. Later capabilities

Later milestones may extend schemas only through versioned migrations:

1. Core foundation.
2. Structured memory lifecycle (edit, archive, supersede, import/export).
3. Git awareness (branch/commit metadata and safe hooks).
4. Session capture and explicit handoffs.
5. Cursor integration and generated rules/context.
6. Local dashboard.
7. Multi-machine synchronization with conflict handling.
8. Semantic retrieval behind an adapter.
9. Plugin SDK and integrations.
10. Release hardening and 1.0.

No milestone may pre-implement a later milestone at the cost of the current milestone's simplicity.

## 5. Compatibility and migrations

- Readers must check `schemaVersion` before parsing the remainder.
- Minor additions require an explicitly revised schema contract; persisted unknown fields remain invalid in v1.
- Major migrations are explicit commands, create backups, support dry runs, and are not part of Milestone 1.

## 6. Open decisions

Project namespace/package name, final GitHub organization, and whether generated context is committed remain maintainers' decisions. Use `cpmk` as the provisional package and repository name; record changes in an ADR.
