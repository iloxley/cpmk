# Milestone 7 — Multi-machine sync

- Status: Accepted
- Date: 2026-08-17
- Depends on: M1–M6, ADR 0006
- ADR: `docs/adr/0010-sync-merge.md`

This document is the implementation contract for Milestone 7.

## 1. Goal

Merge memory from another machine or Git ref without silently overwriting divergent entries. Offline `remember` / `session` / `context` stay available.

## 2. Non-goals

- No new memory-entry properties and no schema v2.
- No hosted service and no mandatory encryption implementation.
- Do not parse `.git`. Git transport uses the Git CLI only.
- No embeddings or plugins.

## 3. Merge rules

Compare entries by `id`.

| Case | Result |
| --- | --- |
| Incoming id is new | Add the incoming entry |
| Same id, byte-identical persisted fields | Unchanged |
| Same id, any persisted field differs | Conflict. Keep local. Record both sides |

Do not smash conflicts by `updatedAt`.

## 4. Commands

All accept `--root`.

### 4.1 `cpmk sync preview --from <path> | --ref <git-ref> [--json]`

Compute the merge. Write nothing. Print `add`, `conflict`, and `unchanged` counts.

### 4.2 `cpmk sync apply --from <path> | --ref <git-ref> [--json]`

Write new incoming entries. Leave conflicting local files untouched. Write `.cpmk/generated/sync-conflicts.json` (replace). Print the same counts as preview.

`--from` is another CPMK project root. `--ref` reads `.cpmk/memory` from that Git ref through `git ls-tree` and `git show`. Exactly one of `--from` or `--ref` is required.

### 4.3 `cpmk sync status [--json]`

Report the current generated conflict file, or `conflicts: 0` if none.

### 4.4 `cpmk sync resolve <id> --keep local|incoming`

Require a conflict for that id. `--keep local` drops it from the file. `--keep incoming` writes the incoming entry, then drops it. If no conflicts remain, write an empty conflict list.

## 5. Conflict document

Path: `.cpmk/generated/sync-conflicts.json`

```json
{
  "schemaVersion": 1,
  "conflicts": [
    {
      "id": "01JEXAMPLE0000000000000000",
      "local": { "...entry": true },
      "incoming": { "...entry": true }
    }
  ]
}
```

This is generated data, not a memory file. Doctor ignores it.

## 6. Encryption

Documentation only in `docs/SECURITY.md`: encrypt the Git remote or disk if memory is sensitive. CPMK does not add a keystore in M7.

## 7. Accepted defaults

1. **Conflict document is generated JSON**, not a v2 memory field.
2. **Git CLI transport** via `--ref`.
3. **No automatic push/pull.** The user still runs `git fetch` / `git push`.
