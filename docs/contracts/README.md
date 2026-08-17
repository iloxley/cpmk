# CPMK contracts

Normative runtime behavior remains `TECHNICAL_SPEC.md` §3 until an accepted ADR amends it. These documents are the proposed contracts for later milestones. Do not implement a later milestone from a sketch; implement only from an accepted contract.

| Milestone | Contract | Status |
| --- | --- | --- |
| M1 Core | `TECHNICAL_SPEC.md` §3 | Accepted |
| M2 Lifecycle | `docs/adr/0005-memory-lifecycle.md` | Accepted |
| M3 Git | `docs/adr/0006-git-cli.md` | Accepted |
| M4 Sessions | [M4_SESSIONS.md](M4_SESSIONS.md), [ADR 0007](../adr/0007-session-workflows.md) | Accepted |
| M5 Cursor | [M5_CURSOR.md](M5_CURSOR.md), [ADR 0008](../adr/0008-cursor-adapter.md) | Accepted |
| M6 Dashboard | [M6_DASHBOARD.md](M6_DASHBOARD.md), [ADR 0009](../adr/0009-local-dashboard.md) | Accepted |
| M7 Sync | [M7_SYNC.md](M7_SYNC.md), [ADR 0010](../adr/0010-sync-merge.md) | Accepted |
| M8 Search | [M8_SEARCH.md](M8_SEARCH.md), [ADR 0011](../adr/0011-lexical-search.md) | Accepted |
| M9 Plugins | [M9_PLUGINS.md](M9_PLUGINS.md), [ADR 0012](../adr/0012-manifest-plugins.md) | Accepted |
| M10 Release | [LATER.md](LATER.md) | Sketch only |

A proposed contract becomes implementable when:

1. open questions in the contract are answered or explicitly deferred;
2. the matching ADR is accepted;
3. tests and recovery notes are part of the same change.
