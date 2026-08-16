# ADR 0002: Ajv for runtime schema validation

- Status: Accepted
- Date: 2026-08-16
- Deciders: CPMK maintainers

## Context

Persisted config and memory files are untrusted. The specification requires bundled JSON Schemas and rejection of unknown properties in schema version 1.

## Decision

Validate files with Ajv against `schemas/config.schema.json` and `schemas/memory-entry.schema.json`. Check `schemaVersion` before the remainder. Keep additional field bounds (Unicode lengths, timestamp ordering) in domain code.

## Consequences

Schema documents stay the contract. Ajv is a runtime dependency. The remote `$schema` URL is metadata only; validation never fetches it.

## Alternatives considered

Hand-written validators would drift from the published schemas. Zod would require a parallel contract and is not specified.

## Links

`TECHNICAL_SPEC.md` §3.2–3.3, `docs/SECURITY.md`
