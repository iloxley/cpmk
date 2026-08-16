# ADR 0006: Git awareness through the Git CLI

- Status: Accepted
- Date: 2026-08-16
- Deciders: CPMK maintainers

## Context

Milestone 3 needs branch, commit, and dirty-tree information. Parsing `.git` internals is forbidden. New persisted Git fields would change the v1 schema.

## Decision

Call the `git` executable (`rev-parse`, `status --porcelain`) with an explicit working directory. Surface metadata in `cpmk status`, doctor/context warnings, and handoff entry content. Do not add Git fields to config or memory JSON. Hooks are opt-in text scripts installed by `cpmk hook install`.

## Consequences

Git is an optional runtime. Non-Git projects keep working. Tests use temporary repositories and override author identity through `git -c`, never the developer's global config.

## Alternatives considered

Reading `.git/HEAD` directly is simpler but violates the milestone constraint. Embedding commit hashes in schema v1 would break M1/M2 readers.

## Links

`IMPLEMENTATION_PLAN.md` Milestone 3
