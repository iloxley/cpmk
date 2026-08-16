# ADR 0001: ESM TypeScript toolchain

- Status: Accepted
- Date: 2026-08-16
- Deciders: CPMK maintainers

## Context

Milestone 1 requires Node.js 22+, strict TypeScript, an npm lockfile, Vitest, ESLint, and Prettier. The implementation must stay portable and avoid shell-specific runtime behavior.

## Decision

Use ECMAScript modules (`"type": "module"`), TypeScript `Node16` module resolution, Vitest for tests, ESLint with `typescript-eslint` type-checked rules, and Prettier. The published binary is `dist/cli.js`.

## Consequences

Source files use `.js` specifiers in relative imports. The package is ESM-only. CommonJS consumers must use dynamic import.

## Alternatives considered

CommonJS would simplify some tooling but fights Node 22 defaults and the specification's ESM requirement. A bundler would add complexity without a Milestone 1 need.

## Links

`TECHNICAL_SPEC.md` §3.1, `ARCHITECTURE.md`
