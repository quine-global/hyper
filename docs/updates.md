# Updates

**macOS** uses [Sparkle](https://sparkle-project.org/): it checks daily (unless
`disableAutoUpdates`), shows its own update window and installs the update;
**Hyper › Check for Updates…** checks on demand. Windows and Linux keep
Electron's `autoUpdater` and a notification, against `hyper.quineglobal.com/update`.

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
