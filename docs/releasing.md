# CI and releasing

The canonical repo is on Quine's Forgejo; GitHub is a push mirror. Actions run
on Forgejo (`.forgejo/workflows/`); releases are downloaded from GitHub.

**CI** (`ci.yml`, every push): lint, tests and packages via `bin/ci/build.sh`:
Linux x64 (deb, rpm, AppImage, pacman), macOS (dmg and zip, x64 and arm64,
ad-hoc signed, with Sparkle) and Windows (one unsigned NSIS installer, x64 and
arm64). Not built yet: Linux arm64/armv7l, snap, flatpak, e2e tests.

**Releasing:**

1. Run **Release** (`release.yml`) and pick the channel. It bumps the version
   on `canary` (canary: the next `-canary.N`; production: the same version
   without `-canary.N`; or give one), tags it, and starts CI on the tag.
2. CI builds it into a draft GitHub release.
3. Edit the draft's notes if you like (Sparkle shows them), then run
   **Publish release** (`publish.yml`) with the tag: it publishes the draft
   (a pre-release if the tag has `canary` in it), updates the `quine-hyper`
   cask (macOS dmg, Linux x86_64 AppImage) and writes the Sparkle appcasts
   ([updates.md](updates.md)). The work is in `bin/ci/publish.mjs`; on a Mac,
   `DRY_RUN=1` runs it without publishing or pushing (its header lists the
   environment it needs).

Pushing a `v…` tag by hand works too: CI picks it up the same way.

**Secrets:** `GH_RELEASE_TOKEN` (GitHub token, Contents read/write on
quine-global/hyper), `SPARKLE_PRIVATE_KEY`, `HOMEBREW_TAP_SSH_KEY` (write
access to quine-global/homebrew-tap).
