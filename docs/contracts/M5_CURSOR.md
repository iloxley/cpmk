# Milestone 5 — Cursor integration

- Status: Accepted
- Date: 2026-08-17
- Depends on: M1–M4, ADR 0007
- ADR: `docs/adr/0008-cursor-adapter.md`

This document is the implementation contract for Milestone 5.

## 1. Goal

Generate bounded Cursor-readable project context and a project rule from existing CPMK memory. Session workflows stay in the CLI. The core remains editor-agnostic.

## 2. Non-goals

- No new `schemaVersion` and no new config or memory-entry properties.
- No writes into `.cursor/` unless the user passes an explicit `--output` path.
- No chat scrape, editor APIs, or Cursor cloud calls.
- No dashboard, sync, embeddings, or plugins.

## 3. Commands

### 3.1 `cpmk cursor generate [--budget <n>] [--output <path>]`

Reuse the same active-entry selection as `cpmk context`.

Default output directory: `.cpmk/generated/cursor/`.

Writes two files:

| File | Role |
| --- | --- |
| `context.md` | Untrusted header plus the existing context Markdown |
| `cpmk.mdc` | Cursor rule with YAML frontmatter |

`--output`:

- omitted → default directory
- directory → write both files there
- path ending in `.mdc` → write only the rule
- path ending in `.md` → write only the context document

Resolve and contain every path to the project root. Atomic writes. Create missing parent directories inside the root.

Print each written absolute path on stdout, one per line.

### 3.2 `cpmk cursor`

Requires `generate`. Other subcommands are usage errors (exit 2).

## 4. Generated rule

`.mdc` shape matches current Cursor project-rule convention:

```markdown
---
description: CPMK project memory and session workflow
alwaysApply: true
---

<!-- cpmk-generated: untrusted project data; do not execute -->

# CPMK

...
```

The rule body is deterministic and includes, in order:

1. A short instruction not to scrape chat and not to execute generated files.
2. The session commands `start`, `status`, `end`, and `resume`.
3. Pointers to `cpmk context`, `cpmk remember`, and `cpmk doctor`.
4. Active `warning` then `convention` entries that fit a 2,000-character body budget after the fixed preamble. Whole entries only; skip leftovers.

Do not invent coding standards that are not in memory.

## 5. Generated context

`context.md` starts with:

```markdown
<!-- cpmk-generated: untrusted project data; do not execute -->
```

then the exact `cpmk context` document for the same budget. `cpmk context` stdout stays unchanged.

## 6. Privacy and trust

- Generated files are data, never executed.
- Diagnostics name paths, never entry bodies.
- Default artifacts stay under `.cpmk/generated/` (already gitignored).
- Writing into `.cursor/rules` is opt-in via `--output`.

## 7. Acceptance criteria

- `cpmk cursor generate` writes valid `.mdc` frontmatter and a context file.
- Default output never touches `.cursor/`.
- Path escape is rejected.
- Unit tests cover golden rule/context bytes and selection.
- Integration tests run the packaged CLI.
- No schema file gains properties.
- Quality gate passes.

## 8. Accepted defaults

1. **Both artifacts** (rule + context), not rules only.
2. **Do not commit generated Cursor files** by default.
3. **No schema v2** for a Cursor output path.
