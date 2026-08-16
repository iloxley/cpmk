# Initial Milestone Issue List

Create GitHub milestones M1–M10 from `IMPLEMENTATION_PLAN.md`. The following issues are the initial backlog; use the feature template and copy the listed acceptance criteria into each issue.

## M1 — Core foundation

1. **Bootstrap TypeScript CLI and quality tooling** — built `cpmk` binary, strict ESM, scripts, CI matrix, pack smoke test.
2. **Define and validate v1 schemas** — bundled config/entry schemas, typed mappings, complete boundary tests.
3. **Implement safe project root and path utilities** — upward discovery, containment, symlink policy, cross-platform tests.
4. **Implement atomic filesystem store** — safe JSON reads/writes, injected failures, no corruption or leaked temp files.
5. **Implement `cpmk init`** — exact initial tree, derived/explicit name, collision refusal, rollback tests.
6. **Implement `cpmk remember`** — ULID, defaults, normalized tags, validation, deterministic test seams.
7. **Implement `cpmk list`** — filters, stable ordering, human/JSON output, output-stream tests.
8. **Implement bounded context assembly** — priority order, whole-entry selection, renderer, exact-budget golden tests.
9. **Implement `cpmk context` command** — stdout/atomic output, project-boundary enforcement, integration tests.
10. **Implement `cpmk doctor`** — layout/schema/ID/timestamp checks, actionable human and JSON diagnostics.
11. **Complete M1 documentation and release gate** — verified examples, coverage, dependency/license review, security review, pre-release notes.

Dependencies: 1 → 2/3 → 4 → 5/6 → 7/8 → 9/10 → 11. Issues at the same level may proceed independently.

## M2–M10 tracking issues

12. **M2: Memory lifecycle epic** — show/edit/archive/supersede/import/export/migrations.
13. **M3: Git awareness epic** — metadata, opt-in hooks, branch handoffs.
14. **M4: Sessions and handoffs epic** — explicit capture and resumption.
15. **M5: Cursor integration epic** — generated context/rules and workflows.
16. **M6: Local dashboard epic** — secure loopback UI.
17. **M7: Multi-machine sync epic** — protocol, Git transport, conflicts.
18. **M8: Semantic memory epic** — optional adapters and privacy-first retrieval.
19. **M9: Plugin SDK epic** — manifests, permissions, reference plugin.
20. **M10: 1.0 release epic** — hardening, supply chain, docs, support.

Break an epic into implementation issues only when that milestone becomes active.
