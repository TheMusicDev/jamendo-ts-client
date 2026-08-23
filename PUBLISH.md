# Publishing `@themusicdev/jamendo-ts-client`

How releases work. `0.1.0` shipped manually (see "First release" below);
every release from `0.1.1` on is a single `git tag` push — CI builds, tests,
and publishes via npm Trusted Publishing (OIDC), no token in the repo.

## What gets published

`package.json` declares `"files": ["dist"]`, so the tarball contains only:

- `dist/**` — compiled JS + `.d.ts` (produced by `bun run build`)
- `LICENSE`
- `README.md`
- `package.json`

Everything else (`src/`, `tests/`, `client-plan.md`, config files, `.env*`)
is excluded. The `pack` job in `.github/workflows/ci_check.yml` asserts this
on every PR via `npm pack --dry-run --json`, so a `files`-field mistake fails
CI before it can reach npm.

`publishConfig.access: public` is set — required for a scoped package
(`@themusicdev/...`), otherwise npm defaults scoped packages to private.

## Releasing (0.1.1 onward)

```sh
# bump version in package.json
git commit -am "chore(release): vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags          # tag push fires release.yml
```

`.github/workflows/release.yml` (job `publish`, environment `release`):

1. `bun install` / `bun run build` / `bun run check:types` / `bun run test`
2. Regenerate `CHANGELOG.md` from conventional commits via
   [git-cliff](https://git-cliff.org/) (`cliff.toml`), commit it straight to
   `main` (`docs(changelog): update for vX.Y.Z [skip ci]`). Skipped if
   nothing changed. Runs before publish, so a changelog failure blocks the
   release instead of leaving a published version with a stale changelog.
3. `setup-node` (Node 24) + latest npm — the OIDC exchange needs npm CLI
   v11.5.1+; Bun builds/tests, Node publishes.
4. `npm publish --access public` via **Trusted Publishing (OIDC)** — GitHub
   mints a short-lived OIDC token (`id-token: write`) that the npm CLI
   exchanges for a one-time publish credential; no `NPM_TOKEN` secret.
   Provenance is automatic (no `--provenance` flag needed).
5. `gh release create vX.Y.Z --generate-notes` — creates the GitHub Release
   with auto-generated notes (commit subjects since the last tag;
   conventional-commit prefixes like `feat:`/`fix:`/`chore:` keep the list
   scannable).

One tag → `CHANGELOG.md` update + npm publish (OIDC + provenance) +
GitHub Release. Version bump is always manual — the workflow publishes
whatever `package.json` `version` is at the tagged commit; it never bumps it.

### Regenerating the changelog locally

```sh
brew install git-cliff   # or: cargo install git-cliff
git-cliff --output CHANGELOG.md   # full history, per cliff.toml
git-cliff --unreleased             # preview what the next release will add
```

`cliff.toml` groups commits by conventional-commit type (feat/fix/docs/...),
matching `.commitlintrc.json`. Merge commits and `chore(release): ...` bump
commits are excluded from the changelog body — they're not user-facing.

Verify after: npmjs.com shows the new version with a green Provenance badge;
the Releases page has the matching tag with generated notes.

## First release (0.1.0 — already done, historical)

`0.1.0` could not use Trusted Publishing: the package didn't exist on npm
yet, so there was no settings page to configure a trusted publisher on. It
was published by hand once, then the trusted publisher was configured
after the fact:

```sh
npm whoami                                  # confirm @themusicdev membership
bun run build
npm pack --dry-run                          # sanity-check tarball contents
npm publish --access public                 # 2FA prompt
gh release create v0.1.0 --generate-notes
```

Then, on npmjs.com (once the package existed):

- Package page → Settings → Trusted Publisher → add GitHub Actions:
  - Organization/user: `TheMusicDev`
  - Repository: `jamendo-ts-client`
  - Workflow filename: `release.yml` (filename only)
  - Environment: `release`
- Same page → Publishing access → **"Require 2FA and disallow tokens"**
  (kills token publishing; only OIDC from here on).
- Same page → Allowed Actions → check **"Allow npm publish"** only.
  `release.yml` runs `npm publish --access public` — that's the action this
  checkbox gates. Leave **"Allow npm stage publish"** unchecked; it gates
  npm's separate staged/unpublished pre-release feature
  (`npm publish --stage`), which the workflow doesn't use.

This section stays for reference — it only applies again if the package
were ever unpublished and re-created from scratch.

## Common pitfalls

- **E404 on publish** → trusted publisher config mismatch (org/repo/workflow/
  environment must match `release.yml` exactly, case-sensitive).
- **`version already exists`** → the tag doesn't match `package.json`
  `version` (npm rejects mismatches), or the same tag was pushed twice.
- **Legacy token path used** → a `NODE_AUTH_TOKEN` env set somewhere;
  `release.yml` does not set one — don't add it.
- `package.json` `repository.url` must exactly match the GitHub repo.

## Versioning

Follow SemVer. Bump `package.json` `version`, commit, tag, push — the release
steps above do the rest.
