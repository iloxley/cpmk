# Release

1. `npm run check`
2. Update `CHANGELOG.md` and `src/domain/version.ts` / `package.json` together
3. Commit on `main`
4. Tag `vX.Y.Z` and push the tag
5. `gh release create vX.Y.Z`
6. Publish npm with provenance when credentials exist: `npm publish --provenance --access public`

GitHub tags are the source of release identity. npm provenance (when used) links the published tarball to the GitHub workflow that built it.

Do not publish from a dirty worktree.
