# Milestone 10 — 1.0 release

- Status: Accepted
- Date: 2026-08-17
- Depends on: M1–M9
- ADR: `docs/adr/0013-1.0-support.md`

This document is the implementation contract for Milestone 10.

## 1. Goal

Publish a 1.0 support policy, threat model, release notes, accessibility notes for the dashboard, a performance regression test, and version `1.0.0`.

## 2. Non-goals

- No new runtime commands.
- No schema v2.
- No hosted service.

## 3. Deliverables

| Item | Location |
| --- | --- |
| Support policy | `docs/SUPPORT.md`, `docs/SECURITY.md` |
| Threat model | `docs/THREAT_MODEL.md` |
| Release / provenance | `docs/RELEASE.md` |
| Dashboard a11y notes | `docs/ACCESSIBILITY.md` |
| Changelog | `CHANGELOG.md` |
| Performance regression | `test/unit/performance.test.ts` |
| Version | `1.0.0` |

## 4. Support policy

After 1.0, the current major release is supported. Pre-release tags (`v0.x.0-mN.0`) are unsupported. Security fixes land on the latest 1.x first. An LTS window is not promised in 1.0.

Generated files under `.cpmk/generated/` are not a supported interchange format. Memory JSON and `config.json` are.

## 5. Performance

Keep the Milestone 1 target: list/context complete within 250 ms p95 for 1,000 entries on a typical laptop, excluding process startup. CI runs a smaller regression (100 entries) with a 5-second budget so the gate is not flaky.

## 6. Accepted defaults

1. **Support the current 1.x line only.**
2. **Generated files are not a supported API.**
3. **Tag `v1.0.0` as the 1.0 release.**
