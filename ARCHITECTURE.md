# Architecture

## System shape

CPMK begins as a layered command-line application:

```text
CLI adapters → application services → domain model
                     ↓
              storage interfaces
                     ↓
             local filesystem
```

Dependencies point inward. The domain model has no dependency on the CLI, filesystem, Git, Cursor, networking, or a database.

## Milestone 1 components

- **CLI:** parses arguments, maps errors to exit codes, and formats output.
- **Application services:** initialize project, create/list memory, assemble context, diagnose project.
- **Domain:** validated config/entry types, ordering, selection, and rendering rules.
- **Storage:** root discovery, JSON reads, atomic writes, and boundary-safe paths.
- **Schemas:** bundled JSON Schema documents and runtime validation.

Suggested source layout is documented in [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md).

## Data flow

For `context`, the CLI discovers the root, storage loads and validates entries, the domain sorts and selects whole entries within the budget, a pure renderer creates Markdown, and the CLI writes stdout or delegates an atomic output write.

## Architectural constraints

- Persisted files are the source of truth.
- Domain algorithms should be pure and testable without disk access.
- Storage interfaces accept explicit roots; no ambient global project state.
- Errors are typed at module boundaries and sanitized at the CLI boundary.
- Time and ID generation are injected into creation services for deterministic tests.
- Later adapters (Git, Cursor, sync, semantic indexes) must not leak into core types.

## Trust boundaries

Memory and configuration files are untrusted input even when local. Validate them fully. Project paths may contain symlinks or hostile names. Rendered Markdown is data, never executable instruction. Network access is absent in Milestone 1.

## Architecture decisions

Accepted decisions live in `docs/adr/` and use [the ADR template](templates/adr.md). The initial decisions to record during implementation are ESM/toolchain choices, schema validator, ULID library, and atomic-write strategy.

## Evolution

Milestone 4 session state stays on schema v1: an open session is an active `task` tagged `session` and `session-open`. Generated `.cpmk/generated/handoff.md` is a view, like `context`.

Milestone 5 treats Cursor as an output adapter. Default artifacts live in `.cpmk/generated/cursor/`; the domain does not depend on editor APIs.

Milestone 6 is a loopback HTTP adapter over the same application services. It does not introduce a database.

Milestone 7 merges v1 entries by id. Git transport uses the Git CLI; conflicts are generated JSON, not a schema change.

Milestone 8 search is lexical ranking after list filters. Embeddings are not required.

Milestone 9 plugins are manifest-only JSON under `.cpmk/plugins`. They cannot execute code.

1.0 support and the generated-file boundary are recorded in ADR 0013.

Use ports/adapters when a second real implementation appears, not pre-emptively. For example, extract a sync transport interface when Git sync is implemented, and a retrieval interface when semantic retrieval is implemented. File schemas evolve independently from internal TypeScript types through explicit mapping and migrations.
