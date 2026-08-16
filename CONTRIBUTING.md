# Contributing to CPMK

Thank you for helping build CPMK. The project favors small, tested changes that preserve local-first behavior.

## Before coding

1. Read `README.md`, `TECHNICAL_SPEC.md`, and the relevant milestone.
2. Find or open an issue using the supplied templates.
3. Confirm the work belongs to the active milestone.
4. For durable design changes, propose an ADR before implementation.

## Development workflow

Use Node.js 22+ and npm 10+. Once Milestone 1 bootstraps the package:

```bash
npm ci
npm run check
npm test
npm run build
npm pack --dry-run
```

Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). Keep pull requests focused and link their issue.

## Required pull request evidence

- concise description and scope;
- tests for changed behavior;
- documentation updates;
- security/privacy and compatibility notes;
- commands run and their results;
- screenshots only for UI changes.

## Coding guidelines

- Strict TypeScript; avoid `any` and unchecked casts.
- Prefer pure domain functions and explicit dependencies.
- Validate all file input at runtime.
- Never expose stored content in diagnostics by default.
- Avoid dependencies unless they materially reduce risk or maintenance.
- Public behavior follows the technical specification; deviations require an ADR/spec update.

## Testing

Unit tests cover pure logic and failure cases. Integration tests invoke the built CLI in isolated temporary directories and must not rely on the developer's home directory, network, timezone, or global Git configuration.

## Reporting security issues

Do not open public issues for suspected vulnerabilities. Follow [docs/SECURITY.md](docs/SECURITY.md).

## Code of conduct

Be respectful, assume good intent, focus critique on the work, and help make participation safe. Maintainers may moderate behavior that is harassing, discriminatory, threatening, or disruptive. A full community code of conduct should be adopted before accepting broad public contributions.
