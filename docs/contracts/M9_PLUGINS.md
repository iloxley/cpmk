# Milestone 9 — Plugins

- Status: Accepted
- Date: 2026-08-17
- Depends on: M1–M8
- ADR: `docs/adr/0012-manifest-plugins.md`

This document is the implementation contract for Milestone 9.

## 1. Goal

Add a capability-limited plugin surface. Core commands work with zero plugins. Plugins receive only declared permissions.

## 2. Non-goals

- No in-process JavaScript load and no subprocess execution in M9.
- No implicit filesystem, Git, or network access.
- No schema change to memory or config.

## 3. Manifest

Path: `.cpmk/plugins/<name>/plugin.json`

```json
{
  "schemaVersion": 1,
  "name": "deny-extra",
  "version": "1.0.0",
  "engines": { "cpmk": ">=0.9.0" },
  "permissions": ["doctor.contribute"],
  "doctor": {
    "warnings": [
      {
        "code": "PLUGIN_HINT",
        "path": ".cpmk",
        "message": "review deny globs before import"
      }
    ]
  }
}
```

Unknown properties are rejected. `name` must match the directory. `engines.cpmk` is a `>=x.y.z` comparator against the running CLI version. The only M9 permission is `doctor.contribute`. Doctor warnings from a plugin are ignored unless that permission is declared.

## 4. Commands

- `cpmk plugin list [--json]`
- `cpmk plugin install <path>` — copy only `plugin.json` from a source directory into `.cpmk/plugins/<name>/`
- `cpmk plugin uninstall <name>` — remove that plugin directory

Invalid manifests are skipped by `list` with a stderr warning? No: list still shows them as invalid in JSON. Human list prints `name  version` for valid plugins only and writes invalid names to stderr. Simpler: list throws if a manifest is invalid (exit 1). Doctor warns `PLUGIN_INVALID` and continues.

Choose: **doctor warns; list skips invalid and prints nothing for them on stdout.**

## 5. Doctor

After built-in checks, load valid permitted plugins and append their warning diagnostics. Warnings do not fail `ok`.

## 6. Reference plugin

`examples/plugins/deny-extra/plugin.json` as specified above.

## 7. Accepted defaults

1. **Manifest-only in M9** (no code execution).
2. **Permission vocabulary starts with `doctor.contribute`.**
3. **Compatibility is `engines.cpmk` vs CLI version.**
