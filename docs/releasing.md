# CI and releasing

Hyper's canonical repo is on Quine's Forgejo, which push-mirrors to GitHub;
Actions run there (`.forgejo/workflows/`), not on GitHub. Releases are still
downloaded from GitHub Releases, since the forge isn't public.

## CI (`ci.yml`)

Every push: lint, unit tests and a packaged build (`bin/ci/build.sh`) on

- **Linux x64:** an x64 runner (`runner-x86-linux`; the forge's
  `ubuntu-latest` is arm64), in a `node:22-bookworm` container started with
  podman: deb, rpm, AppImage, pacman.
- **macOS:** `macos-latest` (host mode): dmg and zip,
  x64 and arm64, ad-hoc signed, with Sparkle embedded ([updates.md](updates.md)).
- **Windows:** `windows-latest` (Windows 11, host mode, with Git, Python and
  the VS 2022 Build Tools' C++ workload, Spectre-mitigated libraries and ARM64
  tools): one unsigned NSIS installer for x64 and arm64. Not linted there (Git checks out CRLF). The
  step runs from cmd, not PowerShell, whose default execution policy refuses
  the runner's step scripts.

## Releasing

1. Bump the version (`pnpm run bump-version`, which sets `package.json` and
   `app/package.json`), commit, tag `v<version>` and push the tag to the forge.
2. **`release.yml`** builds both platforms and uploads them to a **draft**
   GitHub release for the tag (re-running it replaces the files).
3. Check the draft on GitHub, edit its notes if you like (they become
   Sparkle's update notes), then run **Publish release** (`publish.yml`):
   forge → quine-global/hyper → Actions → Publish release → the tag.
   It publishes the draft (a pre-release if the tag has `canary` in it or
   "prerelease" is ticked), points the `quine-hyper` cask at it, and writes
   the Sparkle appcasts for its channel.

## Secrets (on the forge, for quine-global's repos)

| Secret | What |
| --- | --- |
| `GH_RELEASE_TOKEN` | A fine-grained GitHub token for quine-global/hyper with **Contents: read and write**: drafts, uploads and publishes the GitHub release. |
| `SPARKLE_PRIVATE_KEY` | Signs the Mac updates ([updates.md](updates.md)). |
| `HOMEBREW_TAP_SSH_KEY` | An SSH key whose public half can push to `quine-global/homebrew-tap`. |

## Not built here yet

No runner for them on the forge: **Linux arm64 and armv7l**, **snap and flatpak**, and the **e2e tests** (they need a display).
