# ADR 0004: Sibling temporary file then rename

- Status: Accepted
- Date: 2026-08-16
- Deciders: CPMK maintainers

## Context

Failed writes must not corrupt existing entries. The specification requires writing a sibling temporary file, flushing it, then renaming it.

## Decision

Write to `.${basename}.${random}.tmp` in the same directory, `fsync` the handle, close it, then rename onto the target. On Windows, if replace-by-rename fails, move the target aside, rename the temp file into place, and restore the backup on failure. Delete leftover temp files after errors.

## Consequences

Readers never see a partial JSON file at the destination path. Tests inject a failing `rename` to prove the original file is unchanged.

## Alternatives considered

Writing directly to the destination can truncate an existing file. `writeFile` without fsync can lose data on crash.

## Links

`TECHNICAL_SPEC.md` §3.3
