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
      `npm publish --provenance --access public`. Needs an `NPM_TOKEN`
      secret (granular publish token for `@themusicdev/jamendo-ts-client`)
      and `id-token: write` for provenance. Version bump is manual:
      bump `package.json` `version`, commit, tag, push the tag. The workflow
      does NOT bump — it publishes whatever version is in `package.json`
      at the tagged commit. See "Triggering a release" below.
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

## Triggering a release (release.yml)

`release.yml` publishes to npm automatically when a `v*` tag is pushed.
It does **not** bump the version — you own the version number in
`package.json`. Flow:

```sh
# 1. bump version (package.json) — e.g. 0.1.0 → 0.1.1
# 2. commit
git commit -am "chore(release): v0.1.1"
# 3. tag MUST match the package.json version (npm rejects mismatches)
git tag v0.1.1
# 4. push commit + tag — the tag fires release.yml
git push && git push --tags
```

Prerequisites (one-time):
- Repo secret `NPM_TOKEN` set (granular publish token for
  `@themusicdev/jamendo-ts-client`). Add at
  https://github.com/TheMusicDev/jamendo-ts-client/settings/secrets/actions.
- The token's npm account is a member of `@themusicdev` with publish rights.
- `npm whoami` on the publish machine confirms membership before first
  release.

After the run:
- npmjs.com shows the new version with a green **Provenance** badge (links
  the tarball to the exact commit).
- GitHub Releases page reflects the tag.

Manual fallback (no provenance):
```sh
npm publish --access public
```

## Recommended publish order

1. ~~`npm login`~~ — done. Verify `npm whoami` shows the `@themusicdev` member.
2. ~~Decide the 9 dead schema exports~~ — done (unexported, dead-code 0).
3. ~~Add `release.yml` + `npm pack` CI job~~ — done. `sideEffects` deferred
   to issue #10.
4. Open a PR for `chore/pre-publish-cleanup` (this branch), review, merge.
   The CI branch (`ci/setup-pr-agent-and-checks`) is already in `main` — do
   not touch it.
5. Add the `NPM_TOKEN` repo secret (settings → secrets → actions).
6. Trigger the first release via tag (see "Triggering a release" above), or
   `npm publish --access public` manually as a fallback.
7. Verify on npmjs.com: readme renders, repo link present, tarball
   contains only `dist` + `package.json` + README + LICENSE, Provenance badge.