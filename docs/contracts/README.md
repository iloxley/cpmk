# CPMK contracts

Normative runtime behavior remains `TECHNICAL_SPEC.md` §3 until an accepted ADR amends it. These documents are the proposed contracts for later milestones. Do not implement a later milestone from a sketch; implement only from an accepted contract.

| Milestone | Contract | Status |
| --- | --- | --- |
| M1 Core | `TECHNICAL_SPEC.md` §3 | Accepted |
| M2 Lifecycle | `docs/adr/0005-memory-lifecycle.md` | Accepted |
| M3 Git | `docs/adr/0006-git-cli.md` | Accepted |
| M4 Sessions | [M4_SESSIONS.md](M4_SESSIONS.md), [ADR 0007](../adr/0007-session-workflows.md) | Accepted |
| M5–M10 | [LATER.md](LATER.md) | Sketch only |

A proposed contract becomes implementable when:

1. open questions in the contract are answered or explicitly deferred;
2. the matching ADR is accepted;
3. tests and recovery notes are part of the same change.
