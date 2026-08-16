# ADR 0005: Milestone 2 memory lifecycle on schema v1

- Status: Accepted
- Date: 2026-08-16
- Deciders: CPMK maintainers

## Context

Milestone 2 adds show, edit, archive, supersede, import, export, provenance, and explicit migrations. Schema version 1 rejects unknown properties. Inventing a v2 document without a specification amendment would break M1 readers and silently change the persisted contract.

## Decision

Keep `schemaVersion: 1`. Lifecycle commands mutate only existing fields (`title`, `content`, `type`, `tags`, `status`, `updatedAt`, `source`).

- `show` prints stored provenance: id, source, status, timestamps, tags, and body.
- `supersede` marks the old entry `superseded` and creates a new active entry. The replacement relationship is not stored as a new field.
- `import` assigns a new id, `source: import`, and `status: active`. The import path is checked against `privacy.denyGlobs` and is not persisted.
- `migrate` creates a backup, supports `--dry-run`, and currently performs an identity migration for schema 1.

## Consequences

M1 files remain readable. Callers who need a durable supersede link must wait for a specified schema revision. Recovery uses `.cpmk/backups/`.

## Alternatives considered

Schema version 2 with `replaces` / `importedFrom` would record richer provenance but is a persisted-contract change the specification does not yet define.

## Links

`IMPLEMENTATION_PLAN.md` Milestone 2, `TECHNICAL_SPEC.md` §3.3 and §5, `docs/RECOVERY.md`
