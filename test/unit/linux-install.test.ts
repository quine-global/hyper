import test from 'ava';

import {linuxUpdates} from '../../app/utils/linux-install';
import type {LinuxSystem} from '../../app/utils/linux-install';

const EXE = '/opt/Hyper/hyper';
const SOURCES = 'URIs: https://packages.quineglobal.com/hyper/deb\nSuites: stable\n';
const REPO = '[hyper]\nbaseurl=https://packages.quineglobal.com/hyper/rpm/stable/\n';

// A system with these files (path → contents; a directory lists its children).
const system = (files: Record<string, string>, extra: Partial<LinuxSystem> = {}): LinuxSystem => ({
  env: {},
  execPath: EXE,
  home: '/home/me',
  exists: (path) => path in files,
  read: (path) => files[path] ?? null,
  list: (dir) =>
    Object.keys(files)
      .filter((p) => p.startsWith(`${dir}/`))
      .map((p) => p.slice(dir.length + 1)),
  rpmOwner: () => Promise.resolve(null),
  ...extra
});

test('snap and Flatpak installs are left to their stores', async (t) => {
  t.deepEqual(await linuxUpdates(system({}, {env: {SNAP: '/snap/hyper/1'}})), {check: false});
  t.deepEqual(await linuxUpdates(system({}, {env: {FLATPAK_ID: 'com.quineglobal.hyper'}})), {check: false});
  t.deepEqual(await linuxUpdates(system({'/.flatpak-info': ''})), {check: false});
});

test('an AppImage on its own gets a download link', async (t) => {
  t.deepEqual(await linuxUpdates(system({}, {env: {APPIMAGE: '/home/me/Downloads/Hyper.AppImage'}})), {check: true});
});

test("Homebrew's AppImage gets brew upgrade", async (t) => {
  const env = {APPIMAGE: '/home/me/Applications/Hyper-4.0.0-x86_64.AppImage'};
  t.deepEqual(await linuxUpdates(system({'/home/linuxbrew/.linuxbrew/Caskroom/quine-hyper': ''}, {env})), {
    check: true,
    command: 'brew upgrade --cask quine-hyper'
  });
  // In ~/Applications, but not the cask's.
  t.deepEqual(await linuxUpdates(system({}, {env})), {check: true});
});

test('a deb from our apt repo gets apt upgrade', async (t) => {
  const deb = {'/var/lib/dpkg/info/hyper.list': `/opt/Hyper\n${EXE}\n`};
  t.deepEqual(await linuxUpdates(system({...deb, '/etc/apt/sources.list.d/hyper.sources': SOURCES})), {
    check: true,
    command: 'sudo apt update && sudo apt upgrade hyper'
  });
  // Installed by hand from a release: no repo configured.
  t.deepEqual(await linuxUpdates(system({...deb, '/etc/apt/sources.list.d/other.list': 'deb http://x y z'})), {
    check: true
  });
});

test("a deb that isn't the running Hyper doesn't count", async (t) => {
  const files = {
    '/var/lib/dpkg/info/hyper.list': '/opt/Hyper/hyper\n',
    '/etc/apt/sources.list.d/hyper.sources': SOURCES
  };
  t.deepEqual(await linuxUpdates(system(files, {execPath: '/home/me/hyper/hyper'})), {check: true});
});

test('an rpm from our dnf repo gets dnf upgrade, or rpm-ostree on Atomic', async (t) => {
  const rpmOwner = (path: string) => Promise.resolve(path === EXE ? 'hyper' : null);
  const repo = {'/etc/yum.repos.d/hyper.repo': REPO};
  t.deepEqual(await linuxUpdates(system(repo, {rpmOwner})), {check: true, command: 'sudo dnf upgrade hyper'});
  t.deepEqual(await linuxUpdates(system({...repo, '/run/ostree-booted': ''}, {rpmOwner})), {
    check: true,
    command: 'rpm-ostree upgrade'
  });
  t.deepEqual(await linuxUpdates(system({}, {rpmOwner})), {check: true});
});
