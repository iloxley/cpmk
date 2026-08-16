# Recommended Repository Structure

```text
.
├── .cursor/rules/cpmk.mdc
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── docs/
│   ├── adr/
│   ├── CURSOR_START_HERE.md
│   ├── MILESTONE_ISSUES.md
│   ├── REPOSITORY_STRUCTURE.md
│   └── SECURITY.md
├── examples/basic-project/
├── schemas/
│   ├── config.schema.json
│   └── memory-entry.schema.json
├── src/
│   ├── application/
│   ├── cli/
│   ├── domain/
│   ├── storage/
│   └── index.ts
├── templates/
├── test/
│   ├── fixtures/
│   ├── integration/
│   └── unit/
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── IMPLEMENTATION_PLAN.md
├── TECHNICAL_SPEC.md
└── README.md
```

`schemas/`, `src/`, and `test/` are intentionally absent from the specification-only scaffold and are created in Milestone 1. This keeps the first implementation commit responsible for a coherent toolchain rather than inheriting empty code architecture.

Keep CLI formatting out of application services. Keep filesystem calls out of the domain. Export only stable programmatic APIs from `src/index.ts`; internal modules remain package-private.
