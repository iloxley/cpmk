# ADR 0014: In-app user guide and demos

- Status: Accepted
- Date: 2026-08-17
- Deciders: Rob / iloxley

## Context

1.0 shipped a loopback dashboard that only listed and mutated memory. Operators still had to find contributor docs to learn the desktop-and-Git workflow. A desktop “Director” shell was proposed as the next product shape. Shipping Electron or Tauri before the manual and demos exist would wrap an empty window.

## Decision

- Keep `docs/USER_GUIDE.md` and `docs/DEMO_WALKTHROUGH.md` as the authored source.
- Package those files with the CLI.
- Serve them as HTML from the existing loopback dashboard at `/guide` and `/demo`.
- Do not add a markdown dependency. Render a small, escaped subset (headings, lists, fences, links, emphasis).
- Do not start a desktop shell in this change. A desktop app remains a later contract (`docs/contracts/M12_DESKTOP.md`).

The command contract addendum is `docs/contracts/M11_IN_APP_DOCS.md`.

## Consequences

`cpmk dashboard` is the local app: memory, manual, and demos. A future window can load the same URLs. Pack contents grow by two markdown files.

## Alternatives considered

A separate docs site would need hosting and would drift from the installed CLI. Embedding a second copy of the guide as HTML would rot. Electron-first would add a runtime before the content existed.

## Links

`docs/USER_GUIDE.md`, `docs/DEMO_WALKTHROUGH.md`, `docs/contracts/M11_IN_APP_DOCS.md`, `docs/contracts/M12_DESKTOP.md`
