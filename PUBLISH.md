# Publishing jamendo-ts-client

This document describes how to publish `jamendo-ts-client` to the npm registry.
The first release is **0.1.0** (locked in `package.json`).

## Prerequisites

- Node.js / Bun installed.
- An npm account that is a member of the package's owning scope (the package
  is unscoped, so the first publish claims the `jamendo-ts-client` name — make
  sure no one else owns it).
- Run `npm login` once (or configure an auth token via `npm config set
  //registry.npmjs.org/:_authToken=...`).

## What gets published

`package.json` declares `"files": ["dist"]`, so the tarball contains only:

- `dist/**` — compiled JS + `.d.ts` (produced by `bun run build`)
- `LICENSE`
- `README.md`
- `package.json`

Excluded (verified via `npm pack --dry-run`): `openapi-docs/`, `client-plan.md`,
`tests/`, `.env`, `.env.example`, `src/`, `tsconfig*.json`, config files.

`publishConfig: { access: "public" }` is set, so `npm publish` works without
passing `--access` explicitly.

The `prepack` script (`bun run build`) runs automatically before publish, so
`dist/` is always fresh.

## Recommended publish command (v1 — manual)

For the first `0.1.0` release, manual publish is the simplest path:

```bash
# from a clean main after the D1 PR merges
git checkout main
git pull
bun install
npm publish --access public
```

Then tag the release:

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

If you prefer Bun's packager, `bun publish` also works but does not support
provenance; `npm publish` is recommended for the first release.

## Provenance (deferred to a later release)

npm provenance (`--provenance`) signs the package with a Sigstore bundle
attesting to the exact source/commit that produced it. It requires publishing
from GitHub Actions with the `id-token: write` permission and a configured
OIDC trust relationship.

This is valuable but adds a CI workflow + permissions setup that is not needed
for the first `0.1.0` manual publish. Provenance is **deferred** to a later
release; when ready, add a `.github/workflows/publish.yml` that:

1. Runs on a `v*` tag push.
2. Sets `permissions: { id-token: write, contents: read }`.
3. Runs `bun install`, `bun run build`, `bun test`.
4. Runs `npm publish --access public --provenance` using
   `NPM_CONFIG_PROVENANCE=true` and an npm token stored as a repository
   secret (`NPM_TOKEN`).

Until that workflow exists, publish manually with the command above.

## Versioning

Follow SemVer. Bump `package.json` `version`, commit, tag, push, then run the
publish command. `0.1.0` is the first real release.