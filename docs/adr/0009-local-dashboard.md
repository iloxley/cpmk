# ADR 0009: Loopback dashboard as a CLI adapter

- Status: Accepted
- Date: 2026-08-17
- Deciders: Rob / iloxley

## Context

Milestone 6 needs a local UI. A separate package or LAN-visible server would add distribution and attack surface. Schema v1 cannot grow a dashboard config block.

## Decision

Ship a loopback HTTP adapter inside the CLI:

- `cpmk dashboard` binds `127.0.0.1` only.
- HTML and JSON handlers call existing application services.
- A start-of-process token protects mutations.
- No new persisted files.

The command contract is `docs/contracts/M6_DASHBOARD.md`.

## Consequences

The process is foreground-only. Closing the terminal stops the UI. Memory content can appear in a browser; the page must not execute it.

## Alternatives considered

A static file the user opens with `file://` cannot safely POST. A sidecar daemon would violate the no-background-writer rule.

## Links

`docs/contracts/M6_DASHBOARD.md`, `IMPLEMENTATION_PLAN.md` Milestone 6
