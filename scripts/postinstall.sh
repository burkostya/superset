#!/usr/bin/env bash
# Prevent infinite recursion during postinstall
# electron-builder install-app-deps can trigger nested bun installs
# which would re-run postinstall, spawning hundreds of processes

set -euo pipefail

if [ -n "${SUPERSET_POSTINSTALL_RUNNING:-}" ]; then
  exit 0
fi

export SUPERSET_POSTINSTALL_RUNNING=1

# Run sherif for workspace validation
if [ -n "${IN_NIX_SHELL:-}" ]; then
  echo "[postinstall] Skipping sherif inside Nix shell"
else
  sherif
fi

# GitHub CI runs multiple Bun install jobs that do not need desktop native rebuilds.
# Running electron-builder here can trigger nested Bun installs while the main
# install is still materializing packages, which has been flaky with native deps.
if [ -n "${CI:-}" ]; then
  exit 0
fi

# Install native dependencies for desktop app
bun run --filter=@superset/desktop install:deps

ELECTRON_PKG_DIR="apps/desktop/node_modules/electron"
ELECTRON_PATH_FILE="${ELECTRON_PKG_DIR}/path.txt"
ELECTRON_INSTALL_JS="${ELECTRON_PKG_DIR}/install.js"

if [ ! -f "${ELECTRON_PATH_FILE}" ] && [ -f "${ELECTRON_INSTALL_JS}" ]; then
  echo "[postinstall] Electron runtime missing; running electron/install.js"
  if command -v node >/dev/null 2>&1; then
    node "${ELECTRON_INSTALL_JS}"
  else
    bun "${ELECTRON_INSTALL_JS}"
  fi
fi
