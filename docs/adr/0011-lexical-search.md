# ADR 0011: Lexical search before embeddings

- Status: Accepted
- Date: 2026-08-17
- Deciders: Rob / iloxley

## Context

Milestone 8 asks for optional semantic retrieval. Shipping embeddings by default would add models, network, and a disposable index that people might mistake for source of truth.

## Decision

Ship `cpmk search` as in-process lexical ranking over `list` filters. No index. No network. The scoring function is an adapter named `lexical` so an embedding implementation can replace it later without changing the command.

The contract is `docs/contracts/M8_SEARCH.md`.

## Consequences

Search quality is keyword-based. Large stores scan every matching file, which is acceptable at current project sizes.

## Alternatives considered

A local embedding binary would need user configuration and an on-disk cache. Deferred until a specified adapter contract exists.

## Links

`docs/contracts/M8_SEARCH.md`, `IMPLEMENTATION_PLAN.md` Milestone 8
