# Basic CPMK Example

This folder documents the expected Milestone 1 experience. After the CLI exists:

```bash
cpmk init --name basic-project
cpmk remember "Use strict TypeScript" --type convention --tag typescript
cpmk remember "Never commit credentials" --type warning --tag security
cpmk context --budget 2000
cpmk doctor
```

Generated `.cpmk` state is not checked into this scaffold because timestamps and ULIDs should be produced and verified by the implemented CLI. Integration tests should create equivalent state using fixed clocks and IDs.
