#!/usr/bin/env bash
# Builds Hyper in CI (.forgejo/workflows): installs, tests, packages into dist/.
#   bin/ci/build.sh linux   Linux x64: deb, rpm, AppImage, pacman (in node:22-bookworm)
#   bin/ci/build.sh mac     macOS x64 and arm64: dmg and zip (the Mac runner, host mode)
#   bin/ci/build.sh win     Windows: one NSIS installer for x64 and arm64 (host mode,
#                           run with Git's bash)
# Release builds (refs/tags/v*) number the Mac build for Sparkle (docs/updates.md).
set -euo pipefail
PLATFORM=${1:?usage: build.sh linux|mac|win}
cd "$(dirname "$0")/../.."

# pnpm, at package.json's packageManager version, in the job's own directory:
# on the Mac runner (host mode) nothing goes into the account's own PATH.
TMP_DIR=${RUNNER_TEMP:-/tmp}
# On Windows, Git's bash wants /c/… paths (PATH is colon-separated).
command -v cygpath >/dev/null && TMP_DIR=$(cygpath -u "$TMP_DIR")
BIN="$TMP_DIR/hyper-bin"
mkdir -p "$BIN"
corepack enable --install-directory "$BIN"
export PATH="$BIN:$PATH"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

case "$PLATFORM" in
  linux)
    apt-get update -qq
    # rpm: rpmbuild; libarchive-tools: bsdtar, for pacman packages.
    apt-get install -y -qq rpm libarchive-tools >/dev/null
    # The checkout belongs to another uid than the container's root.
    git config --global --add safe.directory "$PWD"
    ;;
  mac)
    # node-gyp wants setuptools; a venv keeps it out of the Mac's Python.
    python3 -m venv "$TMP_DIR/hyper-venv"
    "$TMP_DIR/hyper-venv/bin/pip" install -q setuptools packaging
    export PATH="$TMP_DIR/hyper-venv/bin:$PATH"
    ;;
  win)
    # The runner has Python and the VS 2022 Build Tools (C++ workload, with
    # Spectre-mitigated libraries and the ARM64 tools); node-gyp finds them.
    ;;
  *) echo "unknown platform $PLATFORM" >&2; exit 1 ;;
esac

# A release tag must match the version it builds.
if [[ "${GITHUB_REF:-}" == refs/tags/v* ]]; then
  for f in package.json app/package.json; do
    grep -q "\"version\": \"${GITHUB_REF#refs/tags/v}\"" "$f" || { echo "${GITHUB_REF#refs/tags/} doesn't match $f's version" >&2; exit 1; }
  done
fi

pnpm install --frozen-lockfile
# Lint once, on Linux: Git for Windows checks out with CRLF line endings,
# which the linter would flag everywhere.
[ "$PLATFORM" = win ] || pnpm run lint:ci
pnpm run test
pnpm run build

case "$PLATFORM" in
  linux)
    # Snap and flatpak need snapcraft and bwrap, which the container lacks.
    pnpm exec electron-builder -p never --linux deb rpm AppImage pacman --x64
    ;;
  mac)
    CONFIG=()
    if [[ "${GITHUB_REF:-}" == refs/tags/v* ]]; then
      # Sparkle compares CFBundleVersion and ignores everything after a "-",
      # so 4.0.0-q-canary.18 and .19 would be the same to it: release builds
      # use the run number, which only goes up.
      CONFIG+=(-c.buildVersion="$GITHUB_RUN_NUMBER")
    fi
    # Ad-hoc signed ("-"), never with whatever identity the Mac runner's
    # keychain holds; Sparkle rejects an app whose signature is broken, so
    # it has to be signed, and consistently.
    # ${CONFIG[@]+…}: macOS's bash 3.2 calls an empty array unbound under set -u.
    CSC_IDENTITY_AUTO_DISCOVERY=false pnpm exec electron-builder -p never --mac -c.mac.identity=- ${CONFIG[@]+"${CONFIG[@]}"}
    ;;
  win)
    # Unsigned (no Windows certificate here): SmartScreen warns on first run.
    CSC_IDENTITY_AUTO_DISCOVERY=false pnpm exec electron-builder -p never --win
    ;;
esac
ls -la dist
