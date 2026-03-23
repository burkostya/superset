# Nix Run And Packaging Spec

## Summary

This document captures the Nix-specific knowledge needed to run and package the local-first desktop app on Linux/NixOS.

It exists separately from [`cloud-cut.md`](./cloud-cut.md) because none of the Electron ABI, `devenv`, `ELECTRON_EXEC_PATH`, or Nix-shell script compatibility issues are general repository requirements.

## Current Nix Development Flow

From the repo root:

```bash
direnv allow
# or: nix develop --no-pure-eval

devenv shell
install
desktop-dev
```

Equivalent direct entry:

```bash
nix develop --no-pure-eval
install
desktop-dev
```

Expected behavior:

- `install` runs `bun install`;
- desktop native deps are rebuilt;
- `desktop-dev` starts `electron-vite dev --watch`;
- Electron starts with the Nix-provided runtime;
- local DB migrations complete;
- renderer loads `#/workspace`.

## Nix Shell Contract

The Nix shell must provide:

- Bun and Node;
- C/C++ build toolchain for native modules;
- Linux Electron runtime libraries;
- `SKIP_ENV_VALIDATION=1` for local-only startup;
- `ELECTRON_EXEC_PATH` pointing at the Nix-provided Electron runtime;
- `LD_LIBRARY_PATH` covering the Linux Electron shared library set.

Anchor path:

- `devenv.nix`

## Critical Electron Rule

Desktop on Nix must run against Electron 40-compatible ABI.

Confirmed behavior:

- project dependency is `electron 40.2.1`;
- native rebuilds target Electron 40;
- default `pkgs.electron` resolved to `38.8.4`, which caused `better-sqlite3` ABI mismatch;
- switching to `pkgs.electron_40` fixed the runtime ABI mismatch and allowed Electron to start.

Required rule:

- any Nix shell, derivation, or launcher for desktop must use `electron_40` or another explicitly Electron-40-compatible runtime.

Do not use:

- default `pkgs.electron` without checking its version;
- a runtime/build combination where native modules are rebuilt for one Electron major and launched with another.

## Postinstall And Native Module Notes

### Shell compatibility

Repo scripts used by desktop install must be Nix-safe.

Required rules:

- shell scripts should use `#!/usr/bin/env bash`;
- `postinstall.sh` should be strict-shell compatible with `set -euo pipefail`.

### Nix shell postinstall behavior

Inside Nix shell:

- skip `sherif` during `postinstall` to avoid unnecessary friction in the shell bootstrap;
- still run desktop native dependency install via `electron-builder install-app-deps`.

### Electron runtime bootstrap

With Bun workspace installs, Electron runtime bootstrap may not create `apps/desktop/node_modules/electron/path.txt`.

Required fallback:

- if `path.txt` is missing but `install.js` exists, run the Electron package installer script during postinstall;
- this prevents `electron-vite` from failing with `Electron uninstall`.

Anchor path:

- `scripts/postinstall.sh`

## Verified Runtime Behavior

The following has been validated from the Nix shell:

- `nix develop --no-pure-eval` enters successfully;
- `install` succeeds;
- `desktop-dev` builds main and preload bundles;
- Electron starts with the Nix-provided runtime;
- local DB migrations complete successfully;
- renderer loads `#/workspace`;
- previous `better-sqlite3` ABI mismatch is gone once Electron 40 is used.

Additional fix already required:

- the local DB migration for `chat_sessions` needed `--> statement-breakpoint` separators so `better-sqlite3` would not reject multi-statement SQL during migration.

## Production-Like Run And Packaging

### Production-like local run

From `apps/desktop`:

```bash
bun run build
bun run start
```

Use this when you want a production-style Electron runtime without the Vite dev server.

### Linux package build

From `apps/desktop`:

```bash
bun run clean:dev
bun run compile:app
bun run package -- --publish never --config electron-builder.ts
```

Expected outputs:

- `release/*.AppImage`
- `release/*-linux.yml`

Reference:

- `apps/desktop/BUILDING.md`

### NixOS packaging guidance

For a future Nix derivation:

- prefer a native Nix package over an AppImage-first workflow;
- keep Electron runtime alignment explicit and pinned to Electron 40;
- ensure native modules are rebuilt against the same Electron runtime that will launch the app;
- reuse the current desktop production build path where possible, but do not rely on generic system Electron selection.

This packaging work is separate from the cloud-cut itself. A local-first desktop can still be correct even if the final Nix derivation is not yet implemented.

## Known Nix/Linux Issues

These are known and should not be confused with cloud-cut regressions:

- devtools HTTP server may fail to bind if the devtools port is already in use;
- DBus/systemd warnings may appear during Linux startup;
- some headless or timed runs may later fail on GPU process startup even after the window loads;
- there is a current unrelated `desktop-typecheck` failure in `packages/chat/src/server/trpc/service.ts` around the local TRPC client cast.

The first two are usually noise. The last two should be tracked separately from Nix shell bootstrap.

## Acceptance Criteria

Nix run support is in a good state when:

- `nix develop --no-pure-eval` works;
- `install` succeeds from the shell;
- `desktop-dev` starts Electron with the Electron 40 runtime;
- local DB migrations complete;
- the renderer opens the workspace shell;
- the documented production/package commands match the actual desktop build flow.

## Defaults And Assumptions

- Scope is Linux/NixOS desktop development and packaging only.
- This document is not the source of truth for product-level cloud removal.
- Electron ABI alignment is treated as a hard requirement, not an implementation detail.
