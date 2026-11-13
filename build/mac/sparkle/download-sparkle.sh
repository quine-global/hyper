#!/bin/bash
set -euo pipefail

VERSION="2.9.6"
EXPECTED_SHA256="52bf9e88cdd972fc0c81501377a880e90d47031bd8ca5462488f843e2609e192"

# Fetches Sparkle.framework and its tools (sign_update…), checksummed.
# Usage: download-sparkle.sh [destination-directory]
# Without one, it installs into the directory above this script's.
# When piping the script to bash, supply a destination with: bash -s -- /path/to/app
if [ "$#" -gt 1 ]; then
    echo "Usage: $0 [destination-directory]" >&2
    exit 1
fi
if [ "$#" -eq 1 ]; then
    DESTINATION="$1"
elif [ -n "${BASH_SOURCE[0]:-}" ]; then
    DESTINATION="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
else
    echo "Specify a destination directory when running this script through stdin." >&2
    exit 1
fi

mkdir -p "$DESTINATION"
DESTINATION="$(cd "$DESTINATION" && pwd)"
if [ -d "$DESTINATION/Sparkle.framework" ] || [ -d "$DESTINATION/sparkle-bin" ]; then
    if [ -d "$DESTINATION/Sparkle.framework" ] \
        && [ -x "$DESTINATION/sparkle-bin/sign_update" ] \
        && [ -f "$DESTINATION/sparkle-bin/.archive-sha256" ] \
        && [ "$(cat "$DESTINATION/sparkle-bin/.archive-sha256")" = "$EXPECTED_SHA256" ]; then
        echo "Sparkle ${VERSION} is already installed in $DESTINATION"
        exit 0
    fi
    echo "Destination contains an existing Sparkle installation. Choose an empty destination or remove the old Sparkle.framework and sparkle-bin directories first." >&2
    exit 1
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Downloading Sparkle ${VERSION}..."
curl --fail --location --retry 3 -o "$TEMP_DIR/sparkle.tar.xz" \
    "https://github.com/sparkle-project/Sparkle/releases/download/${VERSION}/Sparkle-${VERSION}.tar.xz"

echo "Verifying checksum..."
printf '%s  %s\n' "$EXPECTED_SHA256" "$TEMP_DIR/sparkle.tar.xz" | shasum -a 256 -c -

echo "Extracting Sparkle.framework and signing tools..."
tar -xf "$TEMP_DIR/sparkle.tar.xz" -C "$TEMP_DIR"
test -d "$TEMP_DIR/Sparkle.framework"
test -x "$TEMP_DIR/bin/sign_update"
cp -R "$TEMP_DIR/Sparkle.framework" "$DESTINATION/Sparkle.framework"
cp -R "$TEMP_DIR/bin" "$DESTINATION/sparkle-bin"
printf '%s\n' "$EXPECTED_SHA256" > "$DESTINATION/sparkle-bin/.archive-sha256"

echo "Installed Sparkle ${VERSION} in $DESTINATION"
