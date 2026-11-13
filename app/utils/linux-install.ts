// How Hyper was installed on Linux, which decides what its update
// notification says (app/updater.ts):
// - snap, Flatpak: their stores update it, so no checks at all;
// - from Quine Global's apt or dnf repo (packages.quineglobal.com), or from
//   Homebrew: the command that updates it;
// - anything else (an AppImage on its own, a package installed by hand from a
//   release): a download link.
import {execFile} from 'child_process';
import {existsSync, readFileSync, readdirSync} from 'fs';
import {homedir} from 'os';
// posix: Linux paths, also when the tests run on Windows.
import {posix} from 'path';

export type LinuxUpdates = {check: false} | {check: true; command?: string};

// What detection reads, so tests can fake it.
export interface LinuxSystem {
  env: NodeJS.ProcessEnv;
  execPath: string;
  home: string;
  exists(path: string): boolean;
  read(path: string): string | null;
  list(dir: string): string[];
  // The rpm package that owns a file, or null.
  rpmOwner(path: string): Promise<string | null>;
}

const REPO = 'packages.quineglobal.com/hyper/';
const BREW_PREFIXES = ['/home/linuxbrew/.linuxbrew', '~/.linuxbrew'];

export async function linuxUpdates(sys: LinuxSystem): Promise<LinuxUpdates> {
  if (sys.env.SNAP || sys.env.FLATPAK_ID || sys.exists('/.flatpak-info')) {
    return {check: false};
  }

  // An AppImage: Homebrew's cask moves it into ~/Applications.
  const appImage = sys.env.APPIMAGE;
  if (appImage) {
    const prefixes = [sys.env.HOMEBREW_PREFIX, ...BREW_PREFIXES]
      .filter((p): p is string => !!p)
      .map((p) => p.replace(/^~/, sys.home));
    const fromBrew =
      posix.dirname(appImage) === posix.join(sys.home, 'Applications') &&
      prefixes.some((p) => sys.exists(posix.join(p, 'Caskroom/quine-hyper')));
    return fromBrew ? {check: true, command: 'brew upgrade --cask quine-hyper'} : {check: true};
  }

  // Configured anywhere in this directory's files with one of these endings.
  const hasRepo = (dir: string, endings: string[]) =>
    sys
      .list(dir)
      .some((f) => endings.some((e) => f.endsWith(e)) && (sys.read(posix.join(dir, f)) ?? '').includes(REPO));

  const dpkgFiles = sys.read('/var/lib/dpkg/info/hyper.list');
  if (dpkgFiles?.split('\n').includes(sys.execPath)) {
    return hasRepo('/etc/apt/sources.list.d', ['.sources', '.list'])
      ? {check: true, command: 'sudo apt update && sudo apt upgrade hyper'}
      : {check: true};
  }

  if ((await sys.rpmOwner(sys.execPath)) === 'hyper') {
    if (!hasRepo('/etc/yum.repos.d', ['.repo'])) {
      return {check: true};
    }
    // Fedora Atomic (Silverblue, Kinoite, Aurora…) layers it with rpm-ostree.
    return {check: true, command: sys.exists('/run/ostree-booted') ? 'rpm-ostree upgrade' : 'sudo dnf upgrade hyper'};
  }

  return {check: true};
}

export const realLinuxSystem: LinuxSystem = {
  env: process.env,
  execPath: process.execPath,
  home: homedir(),
  exists: existsSync,
  read: (path) => {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  },
  list: (dir) => {
    try {
      return readdirSync(dir);
    } catch {
      return [];
    }
  },
  rpmOwner: (path) =>
    new Promise((resolve) => {
      execFile('rpm', ['-qf', '--qf', '%{NAME}', path], (err, stdout) => resolve(err ? null : stdout.trim()));
    })
};
