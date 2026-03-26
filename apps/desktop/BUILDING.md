# Development

With `devenv`/`direnv` from the repo root:

```bash
direnv allow
# or: nix develop --no-pure-eval

devenv shell
install
desktop-dev
```

This follows the current `devenv` flake workflow and loads the Bun/Node/native desktop toolchain in local-only mode.

For packaged or preview-style local-only runs, use `SUPERSET_LOCAL_ONLY=1`.
Unlike `SKIP_ENV_VALIDATION`, this flag is supported outside development builds and is intended for local-first/system-packaged desktop runs.

Without `devenv`:

Run the dev server without env validation or auth:

```bash
SKIP_ENV_VALIDATION=1 bun run dev
```

This skips environment variable validation and the sign-in screen, useful for local development without credentials.

# Release

When building for release, make sure `node-pty` is built for the correct architecture with `bun run install:deps`, then run `bun run release`.

# Linux (AppImage) local build

From `apps/desktop`:

```bash
bun run clean:dev
bun run compile:app
bun run package -- --publish never --config electron-builder.ts
```

Expected outputs in `apps/desktop/release/`:

- `*.AppImage`
- `*-linux.yml` (Linux auto-update manifest)

# Linux auto-update verification (local)

From `apps/desktop` after packaging:

```bash
ls -la release/*.AppImage
ls -la release/*-linux.yml
```

If both files exist, packaging produced the Linux artifact + updater metadata that `electron-updater` expects.

# Portable system-Electron bundle

For packagers that want to ship Superset with a system Electron runtime instead of `electron-builder` output:

```bash
bun run prebuild
bun run stage:portable
```

If you need to rebuild native modules against a specific Electron/Node ABI from an external packager, use:

```bash
NODE_GYP=/path/to/node-gyp.js NODE_BINARY=node bun run rebuild:native-modules
```

This creates `apps/desktop/release/portable-app/` with:

- `dist/` including preview/runtime resources under `dist/resources/`
- `package.json`
- runtime `node_modules/` required by the desktop main process

The output is suitable for wrappers such as a Nix derivation that launches:

```bash
electron /path/to/portable-app
```

with an Electron runtime ABI-compatible with the app's pinned version.
