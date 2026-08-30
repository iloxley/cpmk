# Milestone 12 — Desktop shell (sketch)

- Status: Sketch — not accepted, do not implement
- Date: 2026-08-17
- Depends on: M6, M11
- Related: `docs/adr/0014-in-app-docs.md`

Write a full contract like `M11_IN_APP_DOCS.md` before coding. This file is a boundary sketch.

## 1. Goal

Give CPMK a dock-icon desktop window (the “Director” shape): live memory, the user guide, and the demos, without a terminal in the happy path.

## 2. Non-goals

- No second store, database, account, or sync service.
- No LAN bind, telemetry, or editor plugin host.
- No schema change to make the app work.
- No silent Git push/pull.

## 3. Shape

The window loads the existing loopback dashboard. The process starts `startDashboard` (or `cpmk dashboard`) on `127.0.0.1`, then opens that URL. Memory, Guide, and Demo are already routes. Closing the window stops the server.

Preferred runtime: **Tauri** (small native shell, OS window chrome) wrapping the Node CLI, or **Electron** if one JavaScript runtime is worth the weight. Either way the application layer stays in this package.

## 4. Open questions to settle in the real contract

1. Does the app bundle Node and the CLI, or require `cpmk` on `PATH`?
2. How does the user pick a project root? Folder picker only, or also “open the folder that contains `.cpmk`”?
3. Are there file associations, or is it always “open a folder”?
4. Does the app expose Git actions (status, commit) or leave Git to the user’s existing tools?
5. Auto-update channel, signing, and macOS notarization.

Recommended defaults until debated: bundle the CLI, folder picker, no Git mutations, no auto-update in the first desktop cut.

## 5. Why wait

M11 already puts the manual and demos in the app you can run today (`cpmk dashboard`). A shell without that content would be an empty Director. Accept this contract only when the window chrome is the next product you want to ship.
