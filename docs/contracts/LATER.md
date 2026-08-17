# Later milestone contracts (sketch)

These are boundaries, not implementation specs. Write a full contract like `M4_SESSIONS.md` before coding each milestone.

## M5 — Cursor integration

Accepted contract: `M5_CURSOR.md`.

## M6 — Local dashboard

Accepted contract: `M6_DASHBOARD.md`.

## M7 — Multi-machine sync

Accepted contract: `M7_SYNC.md`.

## M8 — Semantic memory

Accepted contract: `M8_SEARCH.md`.

## M9 — Plugins

- Manifest + declared permissions. Plugins receive only what they declare.
- No implicit filesystem or Git access.
- Core commands must work with zero plugins installed.
- Compatibility policy tied to `schemaVersion` and CLI major version.

Open: process isolation vs in-process load, and the permission vocabulary.

## M10 — 1.0 release

- Threat model, performance, accessibility (if M6 shipped), signed/provenance release, migration tests, support policy.
- Before 1.0, only the newest pre-release is supported (`docs/SECURITY.md`). M10 must replace that sentence.

Open: LTS window and whether generated files are part of the supported surface.
