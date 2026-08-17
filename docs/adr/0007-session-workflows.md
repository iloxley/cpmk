# ADR 0007: Session workflows on schema v1

- Status: Accepted
- Date: 2026-08-17
- Deciders: Rob / iloxley

## Context

Milestone 4 needs start/end/resume, task state, and a resumable handoff document. Schema v1 rejects unknown properties. Chat history must not be ingested unless the user explicitly supplies text. `cpmk handoff` already writes a `handoff` memory entry with Git lines in `content`.

## Decision

Do not add schema version 2 or a `.cpmk/session.json` file.

- An open session is an active `task` tagged `session` and `session-open`.
- `cpmk session start|status|end|resume` are the only new commands.
- `session end` writes a `handoff` entry and `.cpmk/generated/handoff.md`.
- Task state is existing `task` entries. No `cpmk task` command in M4.
- Previous-session linkage is a line in `content`, not a new field.

The full command and document contract is `docs/contracts/M4_SESSIONS.md`.

## Consequences

M1–M3 readers keep working. Session features are recoverable with `list --type task --tag session` if the CLI is missing. Generated handoff can drift from memory until the next `session end`. Tag conventions become part of the product and must be documented.

## Alternatives considered

A versioned `.cpmk/session.json` would make “one open session” a first-class file, but it is new persisted state the specification does not define. Schema v2 with `sessionId` / `replaces` would record lineage cleanly and is deferred until a specified migration exists.

## Links

`docs/contracts/M4_SESSIONS.md`, `IMPLEMENTATION_PLAN.md` Milestone 4, `TECHNICAL_SPEC.md` §3.3 and §5, ADR 0005, ADR 0006
