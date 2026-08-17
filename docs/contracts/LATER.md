# Later milestone contracts (sketch)

These are boundaries, not implementation specs. Write a full contract like `M4_SESSIONS.md` before coding each milestone.

## M5 — Cursor integration

- Consume M4 handoff + `cpmk context`. Do not invent a second memory store.
- Generate Cursor-readable files only under `.cpmk/generated/` or another path the M5 contract names. Do not rewrite the user's `.cursor/rules` unless the user passes an explicit output path.
- Keep domain and storage editor-agnostic. Cursor conventions live in an adapter.
- Still no chat scrape. Session commands stay in the CLI.

Open: which Cursor artifacts (rules vs project context vs both), and whether they are committed.

## M6 — Local dashboard

- Loopback only. No LAN bind by default.
- CLI and `.cpmk` files remain authoritative. The UI is a client of the same application services.
- Mutations require an explicit local action. No background writers.
- Still no database and no telemetry.

Open: bind address, CSRF/auth story for a local browser, and whether the UI is shipped inside the CLI package.

## M7 — Multi-machine sync

- Transport interface first; Git transport is the first adapter.
- Do not parse Git internals. Reuse the M3 CLI approach for metadata.
- Deterministic merge of v1 entries; conflicts presented, not silently smashed.
- Offline must still allow `remember` / `session` / `context`.
- Encryption guidance is documentation plus optional local keying; no mandatory hosted service.

Open: conflict document schema (this will need an explicit persisted-contract ADR).

## M8 — Semantic memory

- Deterministic filters (type, tag, status, budget) run before any ranking.
- Embeddings are optional adapters. The product works with them disabled.
- No default network calls. Any model/runtime is user-configured and out of process.
- Indexes are disposable caches, not the source of truth.

Open: on-disk index format and whether it lives under `.cpmk/generated/`.

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
