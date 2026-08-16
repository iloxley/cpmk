# Recovery

Use these steps when a CPMK project is invalid or a migration needs to be undone.

## Diagnose first

```bash
cpmk doctor --json
```

Repair or remove only the files named in diagnostics. Do not edit IDs so they disagree with filenames.

## Restore a migration backup

`cpmk migrate` copies the current `config.json` and `memory/` tree to:

```text
.cpmk/backups/<utc-timestamp>/
```

To restore:

1. Stop other CPMK commands.
2. Copy `config.json` from the backup over `.cpmk/config.json`.
3. Replace `.cpmk/memory/` with the backup `memory/` directory.
4. Run `cpmk doctor`.

Do not copy backup files into `memory/` beside live entries.

## Unsupported schema versions

If doctor reports `UNSUPPORTED_SCHEMA`, upgrade CPMK or restore a backup written by a compatible release. Milestone 2 does not rewrite files to a newer schema version.

## Corrupt JSON

Replace the named file from backup or version control. `cpmk doctor` never prints stored content.
