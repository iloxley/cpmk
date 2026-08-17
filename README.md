# CPMK — Cursor Project Memory Kit

CPMK is a local-first toolkit for preserving useful project context across AI coding sessions, Git branches, and machines. It turns durable facts—decisions, conventions, current work, and handoff notes—into a small, inspectable memory store that tools such as Cursor can read and update.

> Status: 1.0. Later product work should start from a new accepted contract.

## Why CPMK?

AI coding sessions are temporary, while software projects are not. Important context is often trapped in chat history, repeated in prompts, or lost when a developer changes machines. CPMK aims to provide:

- project-owned, human-readable memory;
- deterministic context assembly with explicit size limits;
- safe local operation with no mandatory hosted service;
- Git-aware handoffs and multi-machine synchronization;
- a stable core that editors and future plugins can integrate with.

## Scope and non-goals

The first release is a command-line tool and file format. It does not scrape private chats, silently modify source code, or require vector databases or cloud accounts. Cursor integration, semantic retrieval, dashboards, and plugins arrive only after the core is proven.

## Quick start for contributors

Requirements: Node.js 22+, npm 10+, and Git.

```bash
npm ci
npm run check
```

`npm run check` formats-checks, lints, typechecks, builds, runs coverage-gated tests, and smoke-installs the packed CLI.

## Documentation map

- [Technical specification](TECHNICAL_SPEC.md) — behavior, data contracts, and acceptance criteria
- [Implementation plan](IMPLEMENTATION_PLAN.md) — incremental milestones and quality gates
- [Architecture](ARCHITECTURE.md) — components, boundaries, and decision records
- [Cursor start guide](docs/CURSOR_START_HERE.md) — exact first implementation sequence
- [Security and privacy](docs/SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Issue backlog](docs/MILESTONE_ISSUES.md)
- [Support policy](docs/SUPPORT.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Release](docs/RELEASE.md)
- [Repository structure](docs/REPOSITORY_STRUCTURE.md)

## Intended CLI

```bash
cpmk init --name example
cpmk remember "API errors use RFC 9457 problem details" --type convention --tag api
cpmk list
cpmk show <id>
cpmk archive <id>
cpmk context --budget 4000
cpmk doctor
cpmk migrate --dry-run
cpmk status
cpmk handoff "Pause here"
cpmk session start --title "API work"
cpmk session status
cpmk session end "Pause here"
cpmk session resume "Pick up the API work"
cpmk cursor generate
cpmk dashboard
cpmk sync preview --from ../other-machine
cpmk sync apply --ref origin/main
cpmk search "RFC 9457"
cpmk plugin list
```

`init` prints the created `.cpmk` path. `remember` prints the new entry ID. `list` prints `id  type  date  title` lines, or a JSON array with `--json`. `context` writes Markdown like:

```markdown
# CPMK Project Context

## Conventions

### API errors use RFC 9457 problem details

API errors use RFC 9457 problem details

Tags: `api`
```

`doctor --json` uses `{ "ok": boolean, "data": ..., "diagnostics": [...] }`. `session status --json` uses the same envelope. An open session is an active `task` tagged `session` and `session-open`. `session end` writes a `handoff` entry and `.cpmk/generated/handoff.md`. `cursor generate` writes `.cpmk/generated/cursor/cpmk.mdc` and `context.md` unless `--output` is supplied. `dashboard` binds `127.0.0.1` only.

## Programmatic API

The package also exports `initProject`, `rememberEntry`, `listMemory`, `buildContext`, `diagnoseProject`, `startSession`, `sessionStatus`, `endSession`, `resumeSession`, `selectEntries`, `renderContext`, and `discoverRoot`. Inject a clock and ID generator when you need deterministic tests.

## Principles

1. Local first and transparent.
2. Plain files before infrastructure.
3. Deterministic behavior before semantic behavior.
4. Explicit user actions before automation.
5. Small, independently releasable milestones.
6. Tests, documentation, and migration paths are product features.

## License

MIT © CPMK contributors. See [LICENSE](LICENSE).
