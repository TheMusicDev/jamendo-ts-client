# Pre-publish checklist — `@themusicdev/jamendo-ts-client`

Tracking notes for the first npm publish. Items struck off are done; the
rest are open. Last updated 2026-08-22.

## Done

- [x] Package name scoped to `@themusicdev/jamendo-ts-client` (org:
      `@themusicdev`). `publishConfig.access: public` already set —
      required for scoped packages, otherwise npm defaults them to
      private.
- [x] `version` 0.1.0, MIT LICENSE (© 2026 themusicdevteam), README with
      install + usage (install/import lines updated to the scoped name).
- [x] `files: ["dist"]` ships only dist; `exports`/`main`/`types` set to a
      single `.` entry (public API locked to the barrel).
- [x] `prepack: bun run build` auto-builds before publish.
- [x] `publishConfig.access: public`.
- [x] CI green (see PR #9 — `ci/setup-pr-agent-and-checks`).
- [x] Removed dead type exports `ListParams` + `AudioFormat`
      (`src/schemas/params.ts`). The underlying `*Schema` consts are still
      used to compose per-resource params; only the unused inferred type
      aliases were dropped. Re-export from `src/index.ts` if they were
      meant as public building blocks.
- [x] Added `repository`, `homepage`, `bugs` npm metadata + `engines`
      (`node >=18`) to `package.json`.

## Open — blocker

- [x] **npm auth.** Done — `npm login` run on the publish machine. Package
      publishes under `@themusicdev` (the logged-in account is a member of
      the org). Verify with `npm whoami` before publish.

## Open — should fix before publish

- [x] **Remaining dead exports (9 runtime schemas).** Dropped the `export`
      keyword on all 9 (`ArtistTrackItemSchema`, `ArtistAlbumItemSchema`,
      `ArtistLocationSchema`, `MusicInfoTagsSchema`, `MusicInfoSchema`,
      `WaveformSchema`, `HeadersSchema`, `FeedImagesSchema`,
      `RadioPlayingNowSchema`). Each is used only in-file to compose parent
      schemas / derive `z.infer` types; none was imported externally. The
      `export` keyword was dead. `bun run check:dead-code` now reports 0
      issues. Public surface stays type-only (schemas internal), which is
      the intended API: consumers get `z.infer` shapes, not validators.

## Open — nice to have

- [x] **Release workflow.** Added `.github/workflows/release.yml`. Fires on
      `git push --tags v*` → builds, typechecks, tests, then
      `npm publish --access public` via **Trusted Publishing (OIDC)** — no
      `NPM_TOKEN` secret — **then** `gh release create --generate-notes` so
      one tag publishes AND creates the GitHub Release. `id-token: write`
      lets GitHub mint a short-lived OIDC token the npm CLI exchanges for a
      one-time publish credential. Provenance is automatic (no
      `--provenance` flag). Uses `setup-node` (Node 24, npm latest) for the
      publish step because the OIDC exchange needs npm CLI v11.5.1+; Bun
      builds/tests, Node publishes. Version bump is manual: bump
      `package.json` `version`, commit, tag, push the tag. The workflow does
      NOT bump — it publishes whatever version is in `package.json` at the
      tagged commit. Also added `.github/release.yml` (groups conventional-
      commit labels into release-note sections). See "Three phases" below.
- [x] **`npm pack --dry-run` CI job.** Added a `pack` job to
      `.github/workflows/ci_check.yml` that builds, runs
      `npm pack --dry-run --json`, and asserts every packed path is under
      `dist/` or one of `LICENSE` / `README.md` / `package.json`. Catches a
      `files`-field mistake before publish. Verified locally (exit 0).
- [~] **`sideEffects: false`** in `package.json` — DEFERRED. Moved to
      issue #10 (https://github.com/TheMusicDev/jamendo-ts-client/issues/10):
      verify ofetch/keyv/zod/p-retry imports are side-effect-free, bundle-test
      tree-shaking, then set the field. Do not set blindly — a wrong claim
      breaks downstream bundlers.
- [ ] **README install variants** — only `bun add` shown. Add
      npm/yarn/pnpm lines for non-Bun users.
- [ ] **`prepare: lefthook install`** — runs when someone installs from
      a git URL. Tarball consumers are unaffected (prepare doesn't run on
      registry installs). Low risk; leave unless git installs need
      guarding.

## Three phases — exact steps

### Phase 1 — bootstrap v0.1.0 (one-time, all manual; release.yml NOT used)

The first version can't use Trusted Publishing — the package doesn't exist
on npm yet, so there's no settings page to configure the trusted publisher
on. So 0.1.0 is published and released by hand, once. release.yml is ignored
for this version (it will fire when you create the release tag below and
fail — no trusted publisher + version already on npm — that one failed run
is cosmetic; delete it).

```sh
# from a machine logged into the @themusicdev member account, on main after the PR merged:
npm whoami                          # confirm @themusicdev membership
bun run build                       # build dist/
npm pack --dry-run                  # sanity-check what ships (only dist/ + root files)
npm publish --access public         # 2FA prompt; creates @themusicdev/jamendo-ts-client on npm
gh release create v0.1.0 --generate-notes   # tag v0.1.0 + GitHub Release with auto notes
```

Then on npmjs.com (now that the package exists):
- https://www.npmjs.com/package/@themusicdev/jamendo-ts-client → Settings →
  Trusted Publisher → add GitHub Actions:
  - Organization/user: `TheMusicDev`
  - Repository: `jamendo-ts-client`
  - Workflow filename: `release.yml` (filename only)
  - Environment: `release`
- Same page → Publishing access → **"Require 2FA and disallow tokens"**
  (kills token publishing; only OIDC from here on).

Optional: repo Settings → Environments → New environment `release` (add
required reviewers if you want a human gate before publish).

### Phase 2 — first automated release v0.1.1 (proves the pipeline works)

Trusted publisher is now configured, so a pushed `v*` tag publishes via
OIDC **and** creates the GitHub Release in one run.

```sh
# bump version in package.json: 0.1.0 → 0.1.1
git commit -am "chore(release): v0.1.1"
git tag v0.1.1
git push && git push --tags          # tag fires release.yml
```

release.yml (run: `publish`, environment `release`):
1. bun install / build / typecheck / test
2. `setup-node` (Node 24) + npm latest
3. `npm publish --access public` (OIDC — no token; provenance automatic)
4. `gh release create v0.1.1 --generate-notes` (GitHub Release with notes
   grouped by `.github/release.yml`)

Verify: npmjs.com shows 0.1.1 with a green Provenance badge; the Releases
page has v0.1.1 with grouped notes.

### Phase 3 — every subsequent release (same as Phase 2)

```sh
# bump version in package.json
git commit -am "chore(release): vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags
```
One tag → npm publish (OIDC + provenance) + GitHub Release. That's the whole
recurring flow.

### Why release.yml must not run for 0.1.0

It would either fail OIDC (no trusted publisher yet) or fail with
"cannot publish over the previously published version 0.1.0". So 0.1.0 is
manual by design. From 0.1.1 the tag does everything.

### Common pitfalls

- **E404 on publish** → trusted publisher config mismatch (org/repo/workflow/
  env must match release.yml exactly, case-sensitive).
- **`version already exists`** → the tag doesn't match `package.json`
  `version` (npm rejects mismatches), or you pushed the same tag twice.
- **Legacy token path used** → a `NODE_AUTH_TOKEN` env is set somewhere;
  release.yml does NOT set one — don't add it.
- `package.json` `repository.url` must exactly match the GitHub repo.

## Checklist (overall)

- [x] `npm login` — done. Verify `npm whoami` shows the `@themusicdev` member.
- [x] Dead schema exports — done (unexported, dead-code 0).
- [x] `release.yml` + `npm pack` CI job — done. `sideEffects` deferred to
      issue #10.
- [ ] Merge PR #11 (`chore/pre-publish-cleanup`). The CI branch
      (`ci/setup-pr-agent-and-checks`) is already in `main` — don't touch it.
- [ ] Phase 1: hand `npm publish` v0.1.0 → `gh release create v0.1.0` →
      configure Trusted Publisher on npmjs.com → harden (disallow tokens).
- [ ] Phase 2: bump → `git tag v0.1.1 && git push --tags` (first OIDC release).
- [ ] Verify on npmjs.com: readme renders, repo link present, tarball is
      only `dist/` + `package.json` + README + LICENSE, Provenance badge.