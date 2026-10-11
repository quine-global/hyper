// Packages
import electron, {app} from 'electron';
import type {BrowserWindow, AutoUpdater as OriginalAutoUpdater} from 'electron';

import retry from 'async-retry';
import ms from 'ms';

// Utilities
import autoUpdaterLinux from './auto-updater-linux';
import {getDefaultProfile} from './config';
import {version} from './package.json';
import {detectPackageManager, PackageManagerUpdater} from './package-manager-updater';
import {getDecoratedConfig} from './plugins';

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

// Installed by Homebrew or Flatpak: ask it for updates and let it install them.
const packageManager = detectPackageManager();

const autoUpdater: AutoUpdater = packageManager
  ? new PackageManagerUpdater(packageManager)
  : isLinux
    ? autoUpdaterLinux
    : electron.autoUpdater;

// Squirrel downloads the update before announcing it; the others only check.
const updateEvent = packageManager || isLinux ? 'update-available' : 'update-downloaded';

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

async function init() {
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

  isInit = true;
}

const updater = (win: BrowserWindow) => {
  if (!isInit) {
    void init();
  }

  const {rpc} = win;

  const onupdate = (ev: Event, releaseNotes: string, releaseName: string, date: Date, updateUrl: string) => {
    const releaseUrl = updateUrl || `https://github.com/quine-global/hyper/releases/tag/${releaseName}`;
    rpc.emit('update available', {
      releaseNotes,
      releaseName,
      releaseUrl,
      canInstall: Boolean(packageManager) || !isLinux,
      installCommand: packageManager?.upgradeCommand
    });
  };

  autoUpdater.on(updateEvent, onupdate);

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
    autoUpdater.removeListener(updateEvent, onupdate);
  });
};

export default updater;
