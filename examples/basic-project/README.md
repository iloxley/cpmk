# Basic CPMK Example

For the full desktop-and-Git story, use [docs/USER_GUIDE.md](../../docs/USER_GUIDE.md) and [docs/DEMO_WALKTHROUGH.md](../../docs/DEMO_WALKTHROUGH.md). This folder still documents the Milestone 1 happy path:

```bash
cpmk init --name basic-project
cpmk remember "Use strict TypeScript" --type convention --tag typescript
cpmk remember "Never commit credentials" --type warning --tag security
cpmk context --budget 2000
cpmk doctor
```

Generated `.cpmk` state is not checked into this scaffold because timestamps and ULIDs should be produced and verified by the implemented CLI. Integration tests should create equivalent state using fixed clocks and IDs.
