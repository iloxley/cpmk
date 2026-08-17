# Security and Privacy

## Reporting a vulnerability

Until a dedicated private reporting channel is configured, contact the repository maintainers privately through the security contact shown in the GitHub organization profile. Do not include secrets or exploit details in a public issue. Maintainers should acknowledge reports within seven days and coordinate disclosure.

## Data model

CPMK stores user-authored project memory inside `.cpmk/`. Milestone 1 performs no network requests and collects no telemetry. Users decide whether memory files are committed to Git.

## Threats considered

- malicious or malformed local configuration/memory files;
- traversal and symlink escapes;
- partial writes and corruption;
- secret material accidentally added to memory or version control;
- Markdown content later interpreted by an AI tool;
- dependency and release-chain compromise.

## Required controls

Validate all persisted data, constrain writes to the project root, reject unsafe symlinks, use atomic writes, sanitize diagnostics, pin dependencies in the lockfile, and run dependency review in CI. Never execute memory content. Generated context should tell consumers it is untrusted project data.

## User guidance

Do not store passwords, tokens, private keys, personal data, or confidential chat transcripts in CPMK. Review `.cpmk/` before committing it. Extend `privacy.denyGlobs` for project-specific sensitive paths. Secret scanning remains recommended even though CPMK itself does not provide it in Milestone 1.

If memory is synchronized through Git, treat the remote as a copy of project data. Use a private remote, disk encryption, and Git-level encryption tools when the repository is not already trusted. CPMK does not ship a keystore; `cpmk sync` only merges local files.

## Supported versions

Before 1.0, only the newest published pre-release is supported. This policy should be reviewed for the 1.0 release.
