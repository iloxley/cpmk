# Milestone 11 — In-app user guide and demos

- Status: Accepted
- Date: 2026-08-17
- Depends on: M6, M10
- ADR: `docs/adr/0014-in-app-docs.md`

This document extends the Milestone 6 HTTP surface. It does not change schema v1.

## 1. Goal

Ship an operator manual and scripted demos inside the loopback app so a developer can learn the desktop and Git workflows without leaving `cpmk dashboard`.

## 2. Non-goals

- No Electron, Tauri, or other desktop runtime.
- No new schema properties, network, or telemetry.
- No markdown engine dependency.
- No change to bind address, CSRF token, or mutation routes.

## 3. Packaged files

The npm package includes:

- `docs/USER_GUIDE.md`
- `docs/DEMO_WALKTHROUGH.md`

The dashboard reads them from the package root (two directories above `dist/application` or `src/application`).

## 4. HTTP surface (additions)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/guide` | HTML rendering of `USER_GUIDE.md` |
| GET | `/demo` | HTML rendering of `DEMO_WALKTHROUGH.md` plus a live session/list panel |

`GET /` keeps the memory UI and gains navigation to Guide and Demo.

Missing packaged docs are a 500 with a short HTML error. Host and token rules are unchanged. `/demo` may embed the start-of-process token so the live panel can call `GET /api/session` and `GET /api/entries` (reads stay unauthenticated, as in M6).

## 5. Rendering

Escape all markdown text as HTML, then apply a fixed subset: ATX headings, fenced code, unordered and ordered lists, paragraphs, `**bold**`, `` `code` ``, thematic breaks, and links whose href is `http(s)`, `#…`, or a relative path. Reject `javascript:` and other schemes. Never `innerHTML` memory content.

## 6. Acceptance criteria

- `/guide` contains the user-guide H1.
- `/demo` contains the demo-walkthrough H1 and can show live session state.
- `npm pack` includes the two markdown files.
- Quality gate passes.

## 7. Accepted defaults

1. **Markdown in `docs/` is the source of truth.** The app renders it; it does not fork a second manual.
2. **Desktop shell waits for M12.** This milestone only fills the existing window.
