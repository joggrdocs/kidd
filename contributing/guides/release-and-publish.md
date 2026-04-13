# Release and Publish

Ship versioned releases to npm using changesets, automated release PRs, and CI publishing.

## Prerequisites

- Familiarity with [Develop a Feature](./developing-a-feature.md)
- Push access to the `main` branch (via approved PRs)

## Steps

### 1. Add a changeset

Every PR that changes a published `@kidd-cli/*` package must include a changeset. Run from the repo root:

```bash
pnpm changeset
```

Follow the prompts:

1. **Select packages** -- choose the packages affected by your change
2. **Select bump type** -- `patch` for fixes, `minor` for features or breaking changes (pre-1.0)
3. **Write a summary** -- one sentence describing the change for the changelog

This creates a `.changeset/<random-name>.md` file. Commit it with your other changes.

### 2. Choose the correct version bump

The project is pre-1.0. Version rules:

| Change type    | Bump    | Example         |
| -------------- | ------- | --------------- |
| Bug fix        | `patch` | `0.23.0` -> `0.23.1` |
| New feature    | `minor` | `0.23.0` -> `0.24.0` |
| Breaking change | `minor` | `0.23.0` -> `0.24.0` |

**Never use `major` while pre-1.0.** Breaking changes use `minor` until the project reaches 1.0.

### 3. Skip changesets for non-published changes

Do not add a changeset for:

- Documentation-only changes
- CI/CD configuration updates
- Contributing docs or internal tooling
- Dev dependency updates that do not affect published output

### 4. Check pending changesets

View all changesets waiting to be released:

```bash
pnpm changeset status
```

### 5. Merge your PR

After approval and green CI, use **Squash and Merge** to land on `main`.

### 6. Automated release PR

When PRs with changesets merge to `main`, the [changesets/action](https://github.com/changesets/action) GitHub Action runs automatically. It either:

- **Creates a release PR** titled `release: version packages` that bumps versions in `package.json` files and updates changelogs
- **Updates the existing release PR** if one is already open, accumulating multiple changesets

The release PR stays open until a maintainer decides to cut a release.

### 7. Publish to npm

When the release PR is merged to `main`, the same GitHub Action detects there are no pending changesets and runs:

```bash
pnpm build && changeset publish
```

This builds all packages and publishes updated ones to npm with `public` access. The workflow is defined in `.github/workflows/release.yml`.

### 8. Verify the release

After the workflow completes, confirm:

- The GitHub Action run is green
- Updated packages appear on npm with the expected version
- Git tags are created for each published package

## Verification

Before merging a PR with a changeset:

1. Run `pnpm changeset status` and confirm the changeset is listed
2. Confirm the bump type is correct (`patch` or `minor`, never `major`)
3. Confirm the summary is clear and describes the change for end users

## Troubleshooting

### Changeset not detected by the bot

**Issue:** The release PR does not include your changes after merging.

**Fix:** Verify the `.changeset/*.md` file was committed and pushed. Run `pnpm changeset status` locally to confirm it exists. The file must be in the `.changeset/` directory at the repo root.

### Wrong version bump in release PR

**Issue:** The release PR shows a `major` bump or an unexpected version.

**Fix:** Edit the changeset `.md` file directly. The first line after the YAML front matter contains the package name and bump type. Change it to the correct type, commit, and push.

### npm publish fails

**Issue:** The release workflow fails at the publish step.

**Fix:** Check the GitHub Actions log. Common causes: expired npm token (`NPM_TOKEN` secret), package name conflict, or a build failure. The `NPM_TOKEN` must be set as a repository secret with publish permissions.

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [changesets/action](https://github.com/changesets/action)

## References

- [Develop a Feature](./developing-a-feature.md)
- [Commit Standards](../standards/git-commits.md)
- [Pull Request Standards](../standards/git-pulls.md)
