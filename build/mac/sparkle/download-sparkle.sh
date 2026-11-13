#!/bin/bash
# Fetches Sparkle.framework and its tools (sign_update…) into a directory, once.
# Usage: download-sparkle.sh <destination>
set -euo pipefail
VERSION=2.9.6 SHA256=52bf9e88cdd972fc0c81501377a880e90d47031bd8ca5462488f843e2609e192
DEST=${1:?usage: download-sparkle.sh <destination>}
[ "$(cat "$DEST/sparkle-bin/.sha256" 2>/dev/null)" = "$SHA256" ] && exit 0
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
curl -fsSL --retry 3 -o "$TMP/sparkle.tar.xz" "https://github.com/sparkle-project/Sparkle/releases/download/$VERSION/Sparkle-$VERSION.tar.xz"
echo "$SHA256  $TMP/sparkle.tar.xz" | shasum -a 256 -c - >/dev/null
tar -xf "$TMP/sparkle.tar.xz" -C "$TMP"
mkdir -p "$DEST" && rm -rf "$DEST/Sparkle.framework" "$DEST/sparkle-bin"
cp -R "$TMP/Sparkle.framework" "$DEST/" && cp -R "$TMP/bin" "$DEST/sparkle-bin"
echo "$SHA256" > "$DEST/sparkle-bin/.sha256"
