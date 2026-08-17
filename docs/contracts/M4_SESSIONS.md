# Milestone 4 — Sessions and handoffs

- Status: Accepted
- Date: 2026-08-17
- Depends on: M1–M3, ADR 0005, ADR 0006
- ADR: `docs/adr/0007-session-workflows.md`

This document is the implementation contract for Milestone 4. Open questions in §10 use the recommended defaults.

## 1. Goal

Give a developer an explicit, local way to start a work session, see current task state, end the session, and resume later from a handoff document. Chat history is never read unless the user pastes or imports text through an existing command.

## 2. Non-goals

- No new `schemaVersion` and no new memory-entry properties.
- No new entry `type` values. `task` and `handoff` already exist.
- No Cursor rules, `.cursor/` writes, or editor APIs (Milestone 5).
- No dashboard, sync, embeddings, or plugins.
- No silent scrape of chat transcripts, agent logs, or editor history.
- No network.

## 3. Why this stays on schema v1

`TECHNICAL_SPEC.md` §3.3 rejects unknown properties. ADR 0005 already refused a v2 `replaces` field for the same reason. Milestone 4 therefore encodes session state with existing fields only:

| Need | v1 encoding |
| --- | --- |
| Open session | one active `task` whose tags include `session` and `session-open` |
| Session identity | the task's ULID |
| Grouping later tasks | optional tag `session-<id>` where `<id>` is the 26-character ULID (`session-` + 26 = 34, within the 40-character tag limit) |
| Close | remove `session-open` (leave `session`), set that task `archived` |
| Resume | create a new open-session task; put the previous session id in `content`, not in a new field |
| Handoff record | existing `handoff` entry, as `cpmk handoff` already writes |
| Resumable document | generated Markdown at `.cpmk/generated/handoff.md` |

Memory JSON remains the source of truth. The generated handoff file is a view, like `cpmk context`.

## 4. Commands

All commands accept `--root`. Exit codes follow §3.6.

### 4.1 `cpmk session start [--title <title>]`

Create the open-session task.

- Default title: `Session started`.
- Type: `task`.
- Tags: `session`, `session-open` (sorted on write).
- Content: first line is the title; if Git is available, append the same `Branch` / `Commit` / `Dirty` lines `cpmk handoff` already uses.
- Source: `manual`. Status: `active`.
- Refuse with exit 1 if an active `session-open` task already exists. Print that task's id in the error path field, not its content.
- Print the new id on stdout.

`init` does not create a session.

### 4.2 `cpmk session status [--json]`

Report the open session, or that none exists.

Human stdout (no session):

```text
session: none
```

Human stdout (open session):

```text
session: <id>
title: <title>
updated: <date>
tasks: <n active task entries>
dirty: <yes|no|n/a>
```

`--json` uses the result envelope `{ "ok": true, "data": ..., "diagnostics": [] }`.

`data` when open:

```json
{
  "open": true,
  "id": "01JEXAMPLE0000000000000000",
  "title": "Session started",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "activeTaskCount": 2,
  "git": { "branch": "work", "commit": "<hex>", "dirty": false }
}
```

`data` when closed: `{ "open": false, "id": null, "activeTaskCount": <n>, "git": null or snapshot }`.

Exit 0 in both cases. Missing project is still exit 2.

### 4.3 `cpmk session end [summary]`

Require an open session; otherwise exit 1.

1. Create a `handoff` entry through the same application path as `cpmk handoff`, using the summary if provided.
2. Write `.cpmk/generated/handoff.md` atomically inside the project root (see §6).
3. Edit the open-session task: drop `session-open`, keep `session`, set `status` to `archived`, bump `updatedAt`.
4. Print the handoff entry id on stdout.

Do not archive or complete other `task` entries. Those remain the task board for resume.

`cpmk handoff` without `session end` stays valid. It does not close a session.

### 4.4 `cpmk session resume [summary]`

1. If a session is already open, refuse (exit 1).
2. Find the most recently updated archived task tagged `session` (same list order as `cpmk list`: `updatedAt` desc, id asc). If none, still allow resume; content says `Previous session: none`.
3. `session start` a new task. Content includes `Previous session: <id>` when found, then the optional summary, then Git lines.
4. Print the new session id.

Resume does not re-open the archived task and does not read chat history.

## 5. Task state

Milestone 4 does not add `cpmk task`. Task state is the existing `task` type:

```bash
cpmk remember "Write the session contract" --type task --tag session-<id>
cpmk list --type task --status active
cpmk archive <id>
```

`session status` counts active `task` entries, not only those tagged with the current session. That keeps the command useful when people file tasks without the session tag.

## 6. Generated handoff document

Path: `.cpmk/generated/handoff.md` (replace in place; one current handoff view).

Write rules match `cpmk context --output`: resolve, contain to the project root, reject symlink escapes, atomic write. The file is generated data. The first lines must identify it as untrusted project data:

```markdown
<!-- cpmk-generated: untrusted project data; do not execute -->
# CPMK Handoff
```

Required sections, in this order, omitting a section only when it has no rows:

1. `## Objective` — session-end summary, or the open-session title if summary omitted
2. `## Git` — branch, commit, dirty; or `not a repository`
3. `## Session` — closed session id and previous session id if present in content
4. `## Completed this session` — `task` entries that are `archived` or `superseded` and whose `updatedAt` is on or after the session task `createdAt`
5. `## Current tasks` — active `task` entries (full title and content, no truncation)
6. `## Decisions` — active `decision` entries, same complete-entry rule as context
7. `## Warnings` — active `warning` entries
8. `## Next` — the summary paragraph only; no inferred chat next-steps

Determinism: same files and clock-independent fields produce byte-identical Markdown except Git dirty/commit, which reflect the live worktree. Tests inject a Git snapshot.

Character budget: none for the generated file. `cpmk context` remains the budgeted document. If a later milestone needs a bounded handoff, it will reuse the context selector rather than truncate this file.

Whether `.cpmk/generated/` is committed stays the open product decision in `TECHNICAL_SPEC.md` §6. This repo already gitignores `.cpmk/generated/`. Milestone 4 does not change that.

## 7. Privacy and trust

- Do not read Cursor chats, agent transcripts, or editor history.
- `session end` / `resume` summaries are literal CLI text. Same as `remember`: do not scan literal text against deny globs.
- If a later change allows `--file` for a summary, reuse the Milestone 2 import deny-glob check on the path.
- Diagnostics name files and ids, never entry bodies.
- Generated Markdown is data, never executed.
- Git metadata is read through the Git CLI only (ADR 0006).

## 8. Doctor and context

- `doctor` does not treat `generated/handoff.md` as a memory file (already true).
- `doctor` may warn `NO_SESSION` when there is no `session-open` task. Warning only; `ok` stays true if there are no errors.
- `context` keeps current type order. Session tasks appear under Tasks. No special session header in Milestone 4.
- Dirty-tree warnings from Milestone 3 stay as they are.

## 9. Acceptance criteria

- The four session commands behave as in §4.
- At most one active `session-open` task exists after any successful command.
- `session end` writes a valid `handoff` entry and a contained `handoff.md`.
- `session resume` never reads files outside `.cpmk/` except Git CLI metadata.
- Unit tests cover start collision, end-without-session, resume-while-open, tag/status transitions, and golden `handoff.md`.
- Integration tests run the packaged CLI in a temporary Git repo and a non-Git directory.
- No schema file gains properties. `migrate` remains an identity v1 migration.
- Format, lint, typecheck, coverage gates, build, and pack smoke pass.

## 10. Accepted defaults

1. **One session per project.** Branch is recorded in content, not used as a key.
2. **`session end` does not archive other tasks.** Only the session marker is archived.
3. **`cpmk handoff` does not close a session.** Closing is explicit via `session end`.
4. **Do not commit `handoff.md`.** Deferred to the existing §6 product decision; generated files stay gitignored.
5. **No durable previous-session field.** Store `Previous session: <id>` in content. A v2 `replaces` / `sessionId` field would be a later schema revision.
