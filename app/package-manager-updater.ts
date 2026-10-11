import {execFile} from 'child_process';
import {EventEmitter} from 'events';
import {existsSync} from 'fs';
import {homedir} from 'os';
import {join} from 'path';
import {promisify} from 'util';

import fetch from 'electron-fetch';
import semver from 'semver';

import {version} from './package.json';
import {isFlatpak} from './utils/flatpak';

const execFileAsync = promisify(execFile);

const CASK = 'quine-hyper';
const CASK_URL = `https://forge.quinefoundation.com/quine-global/homebrew-tap/raw/branch/main/Casks/${CASK}.rb`;
const FLATPAK_APP_ID = 'com.quineglobal.hyper';

// A package manager that installed Hyper, and so owns its updates: Squirrel
// can't replace an app Homebrew or Flatpak manages (and can't install updates
// to an ad-hoc signed app on macOS at all).
export interface PackageManager {
  name: 'homebrew' | 'flatpak';
  // Newest version the package manager would install, or null if it has none
  // newer than what's running.
  latestVersion(): Promise<string | null>;
  // Shell command line that upgrades Hyper. Run in a new tab, so the output
  // (and any password prompt) is visible.
  upgradeCommand: string;
}

const homebrewPrefixes = () =>
  [
    process.env.HOMEBREW_PREFIX,
    '/opt/homebrew',
    '/usr/local',
    '/home/linuxbrew/.linuxbrew',
    join(homedir(), '.linuxbrew')
  ].filter((prefix): prefix is string => Boolean(prefix));

const homebrew = (): PackageManager | null => {
  const prefix = homebrewPrefixes().find((p) => existsSync(join(p, 'Caskroom', CASK)));
  if (!prefix) {
    return null;
  }
  return {
    name: 'homebrew',
    async latestVersion() {
      // The tap is the source of truth for what `brew upgrade` will install.
      const res = await fetch(CASK_URL);
      if (!res.ok) {
        throw new Error(`Fetching ${CASK_URL}: HTTP ${res.status}`);
      }
      const latest = /^\s*version "([^"]+)"/m.exec(await res.text())?.[1];
      return latest && semver.valid(latest) && semver.gt(latest, version) ? latest : null;
    },
    // Absolute path: when Hyper is opened from the Dock or Finder, Homebrew
    // isn't on the PATH it inherits.
    upgradeCommand: `${join(prefix, 'bin', 'brew')} upgrade --cask ${CASK}`
  };
};

const flatpak = (): PackageManager | null => {
  if (!isFlatpak()) {
    return null;
  }
  return {
    name: 'flatpak',
    async latestVersion() {
      // Ask the host's flatpak, which knows the remote Hyper came from.
      // --updates lists only refs with an update, so any line for us means one.
      const {stdout} = await execFileAsync('flatpak-spawn', [
        '--host',
        'flatpak',
        'remote-ls',
        '--updates',
        '--app',
        '--columns=application,version'
      ]);
      const [, latest] =
        stdout
          .split('\n')
          .map((line) => line.split('\t'))
          .find(([app]) => app === FLATPAK_APP_ID) ?? [];
      if (latest === undefined) {
        return null;
      }
      // The version column comes from the app's metainfo and may be blank.
      return latest.trim() || 'a newer version';
    },
    // Session spawns tabs on the host via flatpak-spawn, so this runs the
    // host's flatpak.
    upgradeCommand: `flatpak update -y ${FLATPAK_APP_ID}`
  };
};

export const detectPackageManager = (): PackageManager | null => flatpak() || homebrew();

// Same interface as Electron's autoUpdater, so updater.ts can swap it in. It
// never downloads anything: it only reports what the package manager has.
export class PackageManagerUpdater extends EventEmitter implements Electron.AutoUpdater {
  constructor(readonly packageManager: PackageManager) {
    super();
  }

  // The package manager decides what's latest; Hyper's update feed and its
  // stable/canary channels don't apply.
  setFeedURL() {}

  getFeedURL() {
    return '';
  }

  // Installing is done by running packageManager.upgradeCommand in a tab.
  quitAndInstall() {}

  checkForUpdates() {
    this.emit('checking-for-update');
    this.packageManager
      .latestVersion()
      .then((latest) => {
        if (latest) {
          const name = semver.valid(latest) ? `v${latest}` : latest;
          this.emit('update-available', {}, '', name, new Date());
        } else {
          this.emit('update-not-available');
        }
      })
      .catch((err: Error) => this.emit('error', err));
  }
}
