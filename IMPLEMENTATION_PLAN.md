# Implementation Plan

CPMK must be built incrementally. Complete one milestone, pass its quality gate, document decisions, and commit it before beginning the next. Do not scaffold speculative services or abstractions for later milestones.

## Milestone 1: Core foundation

**Goal:** a dependable local CLI and versioned file format.

Deliverables:

1. Initialize npm, strict TypeScript, ESM, linting, formatting, tests, and build.
2. Add bundled JSON Schemas and typed validators for config and memory entries.
3. Implement root discovery and safe path utilities.
4. Implement atomic filesystem storage.
5. Implement `init`, `remember`, `list`, `context`, and `doctor`.
6. Add unit tests, packaged-CLI integration tests, fixtures, and coverage gates.
7. Add three-platform GitHub Actions CI.
8. Update README examples with verified output.

Definition of done: every acceptance criterion in §3.8 of the technical specification passes. See [the Cursor execution guide](docs/CURSOR_START_HERE.md).

## Milestone 2: Memory lifecycle

Add `show`, `edit`, `archive`, `supersede`, safe file imports, export, provenance, and explicit migrations. Include backward-compatibility tests and recovery documentation.

## Milestone 3: Git awareness

Record current repository/branch/commit metadata without parsing Git internals directly. Add opt-in hooks, branch-aware handoffs, dirty-tree warnings, and tests against temporary Git repositories.

## Milestone 4: Sessions and handoffs

Create explicit session start/end workflows, summaries, task state, and resumable handoff documents. Never ingest chat history without the user's explicit action.

## Milestone 5: Cursor integration

Generate bounded Cursor-readable project context and rules, expose documented commands for session workflows, and test output against supported Cursor conventions. Keep the core editor-agnostic.

## Milestone 6: Local dashboard

Provide a local, read-first UI for browsing, filtering, and editing memories. Bind to loopback only, protect mutations, and keep CLI/file compatibility authoritative.

## Milestone 7: Multi-machine synchronization

Add a transport-neutral sync protocol, Git transport first, deterministic merge behavior, conflict presentation, encryption guidance, and offline operation.

## Milestone 8: Semantic memory

Add optional lexical/embedding retrieval through replaceable adapters. Deterministic filters and privacy boundaries precede ranking; the product remains usable without embeddings.

## Milestone 9: Plugins

Publish a capability-limited plugin API, manifest, lifecycle, compatibility policy, and reference plugin. Plugins receive only declared permissions.

## Milestone 10: Release

Complete threat modeling, performance testing, accessibility review, documentation, signed/provenance-aware release automation, migration testing, and 1.0 support policy.

## Quality gate for every milestone

- Scope and acceptance criteria are agreed in issues before implementation.
- Tests and documentation ship with behavior.
- Formatting, lint, typecheck, tests, build, and package smoke test pass.
- Security/privacy impact is reviewed.
- An ADR records every durable architecture choice.
- Changes are small enough to review and have a clear rollback path.
- The milestone receives a tagged pre-release before the next begins.
