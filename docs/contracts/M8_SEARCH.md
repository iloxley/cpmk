# Milestone 8 — Semantic memory

- Status: Accepted
- Date: 2026-08-17
- Depends on: M1–M7
- ADR: `docs/adr/0011-lexical-search.md`

This document is the implementation contract for Milestone 8.

## 1. Goal

Let users find memories by query without embeddings or network calls. Deterministic filters run first. Ranking is lexical and replaceable later.

## 2. Non-goals

- No embeddings, model downloads, or default network.
- No on-disk index. Files remain the source of truth.
- No schema change.

## 3. Command

`cpmk search <query> [--type] [--tag] [--status] [--json]`

1. Load entries through the same filters as `cpmk list`.
2. Tokenize the query: lowercase, split on `[^a-z0-9]+`, drop empty tokens.
3. Score each remaining entry:
   - +3 per distinct token found in the title
   - +2 per distinct token that equals a tag
   - +1 per distinct token found in the content
4. Drop score 0.
5. Order by score descending, then `updatedAt` descending, then id ascending.

Human output: `id  type  score  title`. `--json` is a result envelope whose `data` is `{ query, results: [{ entry, score }] }`.

Empty query after tokenization is a usage error.

## 4. Adapter

The built-in adapter name is `lexical`. M8 does not load other adapters. A later milestone may add an out-of-process embedding adapter behind the same `score` function.

## 5. Accepted defaults

1. **No index files.**
2. **Lexical only.**
3. **Filters before ranking.**
