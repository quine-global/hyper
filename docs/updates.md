# Updates

## macOS: Sparkle

The Mac app updates itself with [Sparkle](https://sparkle-project.org/), the
standard macOS updater: Sparkle checks daily
(unless `disableAutoUpdates` is set), shows its own "A new version is
available" window, and installs the update itself. **Hyper › Check for
Updates…** checks on demand.

- **The pieces:** `build/mac/sparkle/hyper-sparkle.m` is a small Node-API
  module (`sparkle.node`) that loads `Sparkle.framework` and starts it;
  `app/updater.ts` loads it. `bin/embed-sparkle.js` (electron-builder's
  `afterPack`) builds it and puts it and the framework, fetched by
  `build/mac/sparkle/download-sparkle.sh`, into `Hyper.app`. Sparkle only runs
  in the packaged app, not `pnpm run app`.
- **Appcasts:** `.forgejo/workflows/publish.yml` writes them into the
  Homebrew tap (`quine-global/homebrew-tap`, `appcasts/hyper-*.xml`) when a
  release is published ([releasing.md](releasing.md)), and the app reads
  them from `git.quineglobal.com`. One per architecture and channel:

  | `updateChannel` | Appcasts | Gets |
  | --- | --- | --- |
  | `stable` (default) | `hyper-arm64.xml`, `hyper-x64.xml` | full releases |
  | `canary` | `hyper-canary-arm64.xml`, `hyper-canary-x64.xml` | pre-releases and full releases |

  A tag with `canary` in it, or one published with "prerelease" ticked,
  goes to canary only. A channel is never moved back to an older build, and
  Sparkle never downgrades: switching from canary to stable keeps the canary
  build until a newer stable one is out. Intel builds under Rosetta read the
  arm64 appcasts, so they move to the native build.
- **Signing:** Sparkle only installs updates signed with the Ed25519 key
  whose public half is `SUPublicEDKey` in `electron-builder.json`. The
  private half is the `SPARKLE_PRIVATE_KEY` Actions secret (base64 of the
  32-byte seed, as `generate_keys -x` exports it). Lose it and installed
  apps can't be updated by Sparkle any more, so keep a backup somewhere
  safe. Release builds fail while `SUPublicEDKey` is still the placeholder.
- **Versions:** Sparkle compares `CFBundleVersion` and ignores everything
  after a "-", so `4.0.0-q-canary.18` and `.19` are the same to it. Release
  builds set it to the forge's run number (`bin/ci/build.sh`), which only
  goes up; the appcast's `sparkle:version` is the same.
- **Homebrew:** the cask has `auto_updates true`, so `brew upgrade` leaves
  the app to Sparkle (`brew upgrade --greedy` still upgrades it).

### Setting up the key (once)

With Sparkle's tools (`build/mac/sparkle/download-sparkle.sh /tmp/sparkle`):

```sh
/tmp/sparkle/sparkle-bin/generate_keys --account hyper    # prints the public key
/tmp/sparkle/sparkle-bin/generate_keys --account hyper -x /tmp/hyper-sparkle-key
```

The public key goes into `electron-builder.json`'s `SUPublicEDKey`; the
contents of `/tmp/hyper-sparkle-key` into the `SPARKLE_PRIVATE_KEY` Actions
secret on the forge. Back the private key up, then delete the file.
`generate_keys` also keeps it in the login Keychain.

## Windows and Linux

Electron's `autoUpdater` (Windows) and a notification only (Linux), against
`hyper.quineglobal.com/update`, as before.
