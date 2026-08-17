# ADR 0008: Cursor artifacts as a generated adapter

- Status: Accepted
- Date: 2026-08-17
- Deciders: Rob / iloxley

## Context

Milestone 5 must produce Cursor-readable context and rules. Schema v1 rejects unknown properties. Rewriting a user's `.cursor/rules` without consent would surprise them and mix generated data with hand-authored editor config.

## Decision

Keep schema v1. Treat Cursor as an output adapter:

- Default writes go to `.cpmk/generated/cursor/`.
- Domain rendering stays editor-agnostic; Cursor frontmatter lives in a dedicated renderer.
- Session workflows remain CLI commands. The generated rule only documents them.
- `cpmk context` output does not change.

The full command contract is `docs/contracts/M5_CURSOR.md`.

## Consequences

M1–M4 readers keep working. Users who want a live Cursor rule copy the generated `.mdc` or pass `--output`. Generated files can drift until the next `cursor generate`.

## Alternatives considered

Writing `.cursor/rules/cpmk.mdc` by default would make Cursor pick the rule up immediately, but it mutates editor config the specification does not own. A v2 config field for the output path is deferred.

## Links

`docs/contracts/M5_CURSOR.md`, `IMPLEMENTATION_PLAN.md` Milestone 5, `TECHNICAL_SPEC.md` §4
