# ADR 0012: Manifest-only plugins

- Status: Accepted
- Date: 2026-08-17
- Deciders: Rob / iloxley

## Context

Milestone 9 needs a plugin API. Loading user JavaScript in-process would give plugins the CLI's filesystem and Git access. A subprocess model is safer but is a larger runtime.

## Decision

M9 plugins are validated JSON manifests under `.cpmk/plugins/<name>/plugin.json`. The only hook is contributing doctor warnings, and only with `doctor.contribute`. Install copies `plugin.json` only. Core commands ignore the plugins directory except `plugin` and `doctor`.

The contract is `docs/contracts/M9_PLUGINS.md`.

## Consequences

Plugins cannot transform context or memory yet. That waits for an executed-host ADR. Users can still share policy hints as data.

## Alternatives considered

Dynamic `import()` of `.mjs` files is deferred. It would need a frozen host and a broader permission vocabulary.

## Links

`docs/contracts/M9_PLUGINS.md`, `IMPLEMENTATION_PLAN.md` Milestone 9
