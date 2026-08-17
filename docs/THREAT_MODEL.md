# Threat model (1.0)

## Assets

- Project memory in `.cpmk/memory`
- Configuration, including deny globs
- Generated views that an editor or browser may display
- The local dashboard token for the lifetime of `cpmk dashboard`

## Adversaries

- Malicious or accidental files already in the project tree
- A Git remote that supplies unexpected memory JSON
- A browser tab that can reach `127.0.0.1` while the dashboard is running
- A plugin manifest that tries to inject unexpected doctor text

## Controls

- Validate every persisted file; reject unknown v1 properties
- Atomic writes and project-boundary path checks
- Git metadata and sync reads go through the Git CLI only
- Dashboard binds loopback and requires a mutation token
- Plugins are manifest-only; they do not execute code
- Diagnostics avoid echoing entry bodies
- Generated Markdown is labeled untrusted project data

## Residual risk

A local process can still read `.cpmk/` if the user can. Memory committed to Git is as public as that remote. The dashboard is reachable by other local users/processes on the same machine.
