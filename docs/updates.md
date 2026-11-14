# Updates

**macOS** uses [Sparkle](https://sparkle-project.org/): it checks daily (unless
`disableAutoUpdates`), shows its own update window and installs the update;
**Hyper › Check for Updates…** checks on demand. Windows and Linux keep
Electron's `autoUpdater` and a notification, against `hyper.quineglobal.com/update`.

**Linux** never updates itself; what its notification offers depends on how
Hyper was installed (`app/utils/linux-install.ts`):

| Installed | Notification |
|---|---|
| deb, with Quine Global's apt repo configured | `sudo apt update && sudo apt upgrade hyper` (click to copy) |
| rpm, with the dnf repo configured | `sudo dnf upgrade hyper`, or `rpm-ostree upgrade` on Fedora Atomic |
| Homebrew's cask (an AppImage in `~/Applications`) | `brew upgrade --cask quine-hyper` |
| anything else: an AppImage, a package installed by hand, a snap or Flatpak (Hyper is in no store or Flatpak repo yet) | a Download link |

The repos are at `packages.quineglobal.com`, filled from each GitHub release
(the README has the install lines).

- **Code:** `build/mac/sparkle/hyper-sparkle.m` (a small Node-API module that
  starts Sparkle), built and embedded with `Sparkle.framework` by
  `bin/embed-sparkle.js` (afterPack); loaded by `app/updater.ts`. Only in the
  packaged app.
- **Appcasts:** written by `publish.yml` ([releasing.md](releasing.md)) into
  `quine-global/homebrew-tap`'s `appcasts/`, read from `git.quineglobal.com`;
  one per architecture and channel. `updateChannel: "stable"` reads
  `hyper-{arm64,x64}.xml` (full releases), `"canary"` reads
  `hyper-canary-{arm64,x64}.xml` (pre-releases too). Sparkle never
  downgrades.
- **Signing:** updates must be signed with the private half of
  `SUPublicEDKey` (`electron-builder.json`), the `SPARKLE_PRIVATE_KEY` secret.
  Lose it and installed apps can't update. To make one:
  `build/mac/sparkle/download-sparkle.sh /tmp/sparkle`, then
  `/tmp/sparkle/sparkle-bin/generate_keys` (prints the public key) and
  `generate_keys -x <file>` (exports the private one).
- **Versions:** Sparkle compares `CFBundleVersion` and ignores anything
  after a "-", so release builds set it to the CI run number.
