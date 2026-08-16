# Cursor: Start Here

This is the implementation brief for Milestone 1. Work in small vertical slices and leave the repository passing after every slice.

## Read first

1. `TECHNICAL_SPEC.md` §3
2. `ARCHITECTURE.md`
3. `CONTRIBUTING.md`
4. `docs/REPOSITORY_STRUCTURE.md`

If these documents disagree, the technical specification is authoritative. Record a blocking ambiguity in an issue instead of guessing.

## Execution sequence

### Slice 1 — Toolchain

Create `package.json`, lockfile, strict TypeScript ESM configuration, ESLint, Prettier, Vitest, build scripts, executable CLI stub, and CI. The stub may implement `--help` and `--version`; unsupported commands must fail clearly. Verify the packed binary runs.

### Slice 2 — Domain contracts

Add config and entry JSON Schemas, runtime validation, TypeScript mappings, typed errors, injected clock/ID interfaces, and fixtures. Test every field boundary and reject unknown properties.

### Slice 3 — Safe storage and initialization

Implement project root discovery, path containment/symlink checks, atomic JSON writes, and transactional `init`. Test nested discovery, pre-existing state, partial failures, Unicode paths, and boundary escapes.

### Slice 4 — Create and list memory

Implement `remember` and `list`, including default title/type, normalized tags, stable ordering, JSON output, stderr discipline, and exit codes. Invoke the packaged CLI in integration tests.

### Slice 5 — Context assembly

Implement pure ordering, complete-entry budget selection, Markdown rendering, and safe optional output. Add golden fixtures and boundary tests for exact budgets, skipped oversized entries, Unicode, and deterministic bytes.

### Slice 6 — Doctor and release gate

Implement full diagnostics, corrupt-file handling, duplicate detection, human/JSON results, coverage thresholds, cross-platform CI, documentation examples, and `npm pack` smoke installation.

## Commands to provide

`format`, `format:check`, `lint`, `typecheck`, `test`, `test:coverage`, `build`, and a composite `check`. CI must use `npm ci` and the lockfile.

## Completion report

When Milestone 1 is done, report:

- acceptance criteria with test evidence;
- package contents and install smoke result;
- known limitations;
- dependency and license summary;
- security/privacy review;
- ADRs created;
- recommendation to tag a Milestone 1 pre-release.

Do not begin Milestone 2 in the same change.
