# ADR 0003: ULID generation with ulidx

- Status: Accepted
- Date: 2026-08-16
- Deciders: CPMK maintainers

## Context

Memory IDs must be monotonic ULIDs, and tests need an injected ID generator.

## Decision

Generate IDs with the `ulidx` monotonic factory. Inject `IdGenerator` at the application boundary. Accept 26-character `[0-9A-Z]` IDs so the specification example `01JEXAMPLE0000000000000000` remains valid.

## Consequences

Generated IDs are Crockford Base32 ULIDs. Persisted example IDs that include `L` remain readable. A later schema version can tighten the pattern if maintainers choose strict Crockford-only IDs.

## Alternatives considered

Hand-rolled ULID code increases risk. The `ulid` package is CommonJS-first. Rejecting the specification example ID would conflict with §3.3.

## Links

`TECHNICAL_SPEC.md` §3.3
