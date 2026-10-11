# Shell spawning under Flatpak

## Background

Hyper's Flatpak build (`electron-builder.json` → `flatpak`) sandboxes the app.
Historically this meant the pty shell was spawned *inside* the sandbox's mount
namespace, where `PATH` is whatever the runtime provides
(`/app/bin:/usr/bin`) and host-only locations like `/usr/local` or
`/home/linuxbrew` aren't mounted at all — unlike an unsandboxed terminal such
as Konsole, which inherits the full host `PATH` from the user's shell
profile.

## Fix

`app/session.ts` now detects the sandbox via `app/utils/flatpak.ts`
(`isFlatpak()`, checking `FLATPAK_ID` / `/.flatpak-info`) and, when sandboxed,
spawns the shell through `flatpak-spawn --host` instead of directly:

```
flatpak-spawn --host --watch-bus --directory=<cwd> <shell> <shellArgs>
```

`--host` runs `<shell>` on the host via the `org.freedesktop.Flatpak` portal,
so it's the real host binary (e.g. the host's `/bin/bash`), not anything
from `/app` or the runtime's `/usr`. The sandboxed `PATH` is deleted from the
env passed to `flatpak-spawn` so the host's own `--login` shell profile
computes `PATH` from scratch, matching what Konsole would produce. All other
env vars (`DISPLAY`, `DBUS_SESSION_BUS_ADDRESS`, `XDG_RUNTIME_DIR`,
`SSH_AUTH_SOCK`, `TERM`, etc.) are still forwarded as-is.

`electron-builder.json`'s Flatpak `finishArgs` gained
`--talk-name=org.freedesktop.Flatpak`, which `flatpak-spawn --host` requires.

Non-Flatpak builds (deb/rpm/snap/pacman/AppImage/Win/Mac) are unaffected —
they still spawn the shell directly.

## Known limitation: bare shell names

`<shell>` is passed to `flatpak-spawn --host` as a literal argument and is
**not** resolved against any `PATH` — it only works because the shell value
is normally an absolute path (`default-shell` resolves `process.env.SHELL`,
falling back to `/bin/bash`).

If a user's Hyper profile config sets a custom `shell` as a **bare command
name** instead of an absolute path (e.g. `"shell": "fish"` rather than
`"shell": "/usr/bin/fish"`), spawning will fail under the Flatpak build:
there's no `PATH` on the host-exec side to search, since `PATH` is
intentionally stripped before the sandboxed `PATH` value can leak to the
host's `--login` shell (see "Fix" above).

This is a pre-existing footgun made slightly worse by this change — not
currently handled specially. If it needs fixing, the options are:

- Resolve bare shell names to absolute paths before constructing
  `spawnArgs` in `app/session.ts` (e.g. via a `flatpak-spawn --host which
  <shell>` lookup, or requiring absolute paths in profile config).
- Document the requirement in `README.md`/config docs so profile authors
  know to use absolute paths for `shell` on Linux.
