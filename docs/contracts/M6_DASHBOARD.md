# Milestone 6 — Local dashboard

- Status: Accepted
- Date: 2026-08-17
- Depends on: M1–M5
- ADR: `docs/adr/0009-local-dashboard.md`

This document is the implementation contract for Milestone 6.

## 1. Goal

Provide a local, read-first browser UI for listing, filtering, adding, and archiving memories. The CLI and `.cpmk` files remain authoritative.

## 2. Non-goals

- No new schema properties.
- No database, telemetry, LAN bind, or background writer.
- No sync, embeddings, or plugins.
- No authentication against remote users.

## 3. Command

`cpmk dashboard [--port <n>]`

- Bind `127.0.0.1` only. There is no `--bind` flag in M6.
- Default port `7435`. `--port 0` asks the OS for an ephemeral port.
- Print `http://127.0.0.1:<port>/` on stdout and block until SIGINT/SIGTERM.
- The HTML UI ships inside the CLI package.

## 4. HTTP surface

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | HTML page |
| GET | `/api/health` | `{ "ok": true }` |
| GET | `/api/entries` | list with optional `type`, `tag`, `status` |
| GET | `/api/session` | `sessionStatus` JSON envelope |
| POST | `/api/remember` | `{ content, title?, type?, tags? }` |
| POST | `/api/archive` | `{ id }` |

JSON responses use `{ "ok", "data", "diagnostics" }` except health.

## 5. Security

- Listen on loopback only.
- Reject requests whose `Host` is not `127.0.0.1` or `localhost` (with optional port).
- Generate a random token at start. Embed it in the HTML page. Mutations require header `X-CPMK-Token`.
- Escape or `textContent`-render memory fields. Never `innerHTML` user content.
- Limit POST bodies to 32 KiB.
- No cookies that are usable off-loopback. No telemetry.

## 6. Mutations

Reuse `rememberEntry` and `archiveEntry`. The UI is another adapter, not a second store.

## 7. Acceptance criteria

- Server refuses non-loopback hosts and tokenless mutations.
- Application tests start an ephemeral server, read, remember, and archive.
- Packaged CLI help/args cover `dashboard`.
- Quality gate passes.

## 8. Accepted defaults

1. **Bind `127.0.0.1` only.**
2. **CSRF token in the page + header**, not cookie-only.
3. **UI ships inside the CLI package.**
