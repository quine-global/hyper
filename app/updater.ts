// Updates: Sparkle on macOS (the standard native updater: its own window,
// a daily background check and Hyper › Check for Updates…),
// reading appcasts that .forgejo/workflows/publish.yml writes into the
// Homebrew tap (docs/updates.md). Elsewhere, Electron's autoUpdater (Windows)
// or a notification only (Linux), against hyper.quineglobal.com/update. On
// Linux the notification depends on how Hyper was installed
// (utils/linux-install.ts): the command that updates it for our apt/dnf
// repos and Homebrew, a download link otherwise.

// Packages
import {join} from 'path';

import electron, {app} from 'electron';
import type {BrowserWindow, AutoUpdater as OriginalAutoUpdater} from 'electron';

import retry from 'async-retry';
import ms from 'ms';

// Utilities
import autoUpdaterLinux from './auto-updater-linux';
import {getDefaultProfile} from './config';
import {version} from './package.json';
import {getDecoratedConfig} from './plugins';
import {linuxUpdates, realLinuxSystem} from './utils/linux-install';

// Necessary due to typescript not handling overloads well
type AutoUpdaterEvent =
  | 'error'
  | 'checking-for-update'
  | 'before-quit-for-update'
  | 'update-downloaded'
  | 'update-available'
  | 'update-not-available';

interface AutoUpdater extends Omit<OriginalAutoUpdater, 'on' | 'removeListener'> {
  on(event: AutoUpdaterEvent, listener: (...args: any[]) => void): this;

  removeListener(event: AutoUpdaterEvent, listener: (...args: any[]) => void): this;
}

const {platform} = process;
const isLinux = platform === 'linux';
const isMac = platform === 'darwin';

const autoUpdater: AutoUpdater = isLinux ? autoUpdaterLinux : electron.autoUpdater;

const getDecoratedConfigWithRetry = async () => {
  return await retry(() => {
    const content = getDecoratedConfig(getDefaultProfile());
    if (!content) {
      throw new Error('No config content loaded');
    }
    return content;
  });
};

const checkForUpdates = async () => {
  const config = await getDecoratedConfigWithRetry();
  if (!config.disableAutoUpdates) {
    autoUpdater.checkForUpdates();
  }
};

let isInit = false;
// Linux: the command that updates this install, if a package manager does.
let updateCommand: string | undefined;
// Default to the "stable" update channel
let canaryUpdates = false;

const buildFeedUrl = (canary: boolean, currentVersion: string) => {
  const arch = process.arch === 'arm64' || app.runningUnderARM64Translation ? 'arm64' : 'x64';
  const plat = isLinux ? 'linux' : platform;
  const channel = canary ? 'canary' : 'stable';

  const params = new URLSearchParams({
    platform: plat,
    arch,
    version: currentVersion,
    channel
  });

  return `https://hyper.quineglobal.com/update?${params.toString()}`;
};

const isCanary = (updateChannel: string) => updateChannel === 'canary';

// sparkle.node (build/mac/sparkle/hyper-sparkle.m), which bin/embed-sparkle.js
// puts in the packaged app.
interface Sparkle {
  start(feedURL: string, automaticChecks: boolean): void;
  setFeedURL(feedURL: string): void;
  setAutomaticChecks(on: boolean): void;
  checkForUpdates(): void;
}

let sparkle: Sparkle | null = null;

// One appcast per channel and architecture. An Intel build running under
// Rosetta reads the arm64 one, so its next update is the native build.
const sparkleFeedURL = (canary: boolean) => {
  const arch = process.arch === 'arm64' || app.runningUnderARM64Translation ? 'arm64' : 'x64';
  const name = canary ? `hyper-canary-${arch}` : `hyper-${arch}`;
  return `https://git.quineglobal.com/quine-global/homebrew-tap.git/tree/appcasts/${name}.xml?raw=true`;
};

async function initSparkle() {
  try {
    const module = {exports: {}};
    process.dlopen(module, join(process.resourcesPath, 'sparkle.node'));
    sparkle = module.exports as Sparkle;
  } catch (err) {
    // Not the packaged app (`pnpm run app`).
    console.error('Updates are only available in the packaged app:', err);
    return;
  }

  const config = await getDecoratedConfigWithRetry();
  let canary = isCanary(config.updateChannel);
  sparkle.start(sparkleFeedURL(canary), !config.disableAutoUpdates);

  app.config.subscribe(async () => {
    const {updateChannel, disableAutoUpdates} = await getDecoratedConfigWithRetry();
    if (isCanary(updateChannel) !== canary) {
      canary = isCanary(updateChannel);
      sparkle?.setFeedURL(sparkleFeedURL(canary));
    }
    sparkle?.setAutomaticChecks(!disableAutoUpdates);
  });
}

// Hyper › Check for Updates… (macOS).
export const checkForUpdatesNow = () => {
  if (sparkle) {
    sparkle.checkForUpdates();
  } else {
    console.error('Updates are only available in the packaged app');
  }
};

async function init() {
  isInit = true;
  if (isLinux) {
    const updates = await linuxUpdates(realLinuxSystem);
    if (!updates.check) {
      return;
    }
    updateCommand = updates.command;
  }

  autoUpdater.on('error', (err: Error) => {
    console.error('Error fetching updates', `${err.message} (${err.stack})`);
  });

  const config = await getDecoratedConfigWithRetry();

  // If defined in the config, switch to the "canary" channel
  if (config.updateChannel && isCanary(config.updateChannel)) {
    canaryUpdates = true;
  }

  const feedURL = buildFeedUrl(canaryUpdates, version);

  autoUpdater.setFeedURL({url: feedURL});

  setTimeout(() => {
    void checkForUpdates();
  }, ms('10s'));

  setInterval(() => {
    void checkForUpdates();
  }, ms('30m'));
}

const updater = (win: BrowserWindow) => {
  // Sparkle is the app's, not a window's: started once, with its own window.
  if (isMac) {
    if (!isInit) {
      isInit = true;
      void initSparkle();
    }
    return;
  }

  if (!isInit) {
    void init();
  }

  const {rpc} = win;

  const onupdate = (ev: Event, releaseNotes: string, releaseName: string, date: Date, updateUrl: string) => {
    const releaseUrl = updateUrl || `https://github.com/quine-global/hyper/releases/tag/${releaseName}`;
    rpc.emit('update available', {releaseNotes, releaseName, releaseUrl, canInstall: !isLinux, updateCommand});
  };

  if (isLinux) {
    autoUpdater.on('update-available', onupdate);
  } else {
    autoUpdater.on('update-downloaded', onupdate);
  }

  rpc.once('quit and install', () => {
    autoUpdater.quitAndInstall();
  });

  app.config.subscribe(async () => {
    const {updateChannel} = await getDecoratedConfigWithRetry();
    const newUpdateIsCanary = isCanary(updateChannel);

    if (newUpdateIsCanary !== canaryUpdates) {
      const feedURL = buildFeedUrl(newUpdateIsCanary, version);

      autoUpdater.setFeedURL({url: feedURL});
      void checkForUpdates();

      canaryUpdates = newUpdateIsCanary;
    }
  });

  win.on('close', () => {
    if (isLinux) {
      autoUpdater.removeListener('update-available', onupdate);
    } else {
      autoUpdater.removeListener('update-downloaded', onupdate);
    }
  });
};

export default updater;
