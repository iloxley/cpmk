# ADR 0010: Deterministic v1 sync merge

- Status: Accepted
- Date: 2026-08-17
- Deciders: Rob / iloxley

## Context

Milestone 7 needs multi-machine merge. Schema v1 cannot grow a `replicaId` or `vectorClock`. Parsing `.git` is forbidden (ADR 0006). Silently taking the newest `updatedAt` would hide divergence.

## Decision

- Merge by entry id only.
- New ids are added. Identical ids are kept. Divergent ids become generated conflicts.
- Git transport is `git ls-tree` / `git show` for `.cpmk/memory`.
- Encryption is guidance, not a new subsystem.

The command contract is `docs/contracts/M7_SYNC.md`.

## Consequences

Users must resolve conflicts explicitly. Two machines that edit the same id will not lose either version, but they must choose. Offline commands are unchanged.

## Alternatives considered

A v2 CRDT or `replaces` field would record lineage more cleanly and is deferred. Auto-pushing to `origin` would mix SCM policy with memory merge.

## Links

`docs/contracts/M7_SYNC.md`, ADR 0006, `IMPLEMENTATION_PLAN.md` Milestone 7
