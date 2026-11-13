// Puts Sparkle into the Mac app (afterPack, before signing): Sparkle.framework
// into Contents/Frameworks, and sparkle.node (build/mac/sparkle/
// hyper-sparkle.m, which app/updater.ts loads) into Contents/Resources.
// Both are universal, so they're made once and reused for each architecture.
const {execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sparkleDir = path.join(root, 'build', 'mac', 'sparkle');
// Git-ignored, like the snapshots next to it.
const cacheDir = path.join(root, 'cache', 'sparkle');
const placeholderKey = 'SET-ME-sparkle-generate_keys';

// node_api.h: from the Node running this (setup-node's include/node), or else
// the Electron headers electron-rebuild downloaded.
function nodeApiHeaders(electronVersion) {
  const candidates = [
    path.join(path.dirname(process.execPath), '..', 'include', 'node'),
    path.join(os.homedir(), '.electron-gyp', electronVersion, 'include', 'node')
  ];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, 'node_api.h')));
  if (!found) {
    throw new Error(`embed-sparkle: no node_api.h in ${candidates.join(' or ')}`);
  }
  return found;
}

function buildModule(electronVersion) {
  const output = path.join(cacheDir, 'sparkle.node');
  execFileSync(
    'clang',
    [
      '-bundle',
      '-undefined',
      'dynamic_lookup',
      '-fobjc-arc',
      '-arch',
      'arm64',
      '-arch',
      'x86_64',
      '-mmacosx-version-min=12.0',
      '-I',
      nodeApiHeaders(electronVersion),
      '-framework',
      'Foundation',
      '-framework',
      'AppKit',
      '-o',
      output,
      path.join(sparkleDir, 'hyper-sparkle.m')
    ],
    {stdio: 'inherit'}
  );
  return output;
}

exports.default = async (context) => {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }
  // A release build with no real key could never be updated by Sparkle: it
  // only installs updates signed with the key whose public half is here.
  const {SUPublicEDKey} = context.packager.config.mac.extendInfo;
  if (SUPublicEDKey === placeholderKey && (process.env.GITHUB_REF || '').startsWith('refs/tags/')) {
    throw new Error('embed-sparkle: set SUPublicEDKey in electron-builder.json (docs/updates.md)');
  }

  fs.mkdirSync(cacheDir, {recursive: true});
  execFileSync(path.join(sparkleDir, 'download-sparkle.sh'), [cacheDir], {stdio: 'inherit'});
  const electronVersion = context.packager.config.electronVersion || require('electron/package.json').version;
  const sparkleNode = buildModule(electronVersion);

  const contents = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents');
  const framework = path.join(contents, 'Frameworks', 'Sparkle.framework');
  fs.rmSync(framework, {recursive: true, force: true});
  // ditto keeps the framework's symlinks (Versions/Current…) as they are.
  execFileSync('ditto', [path.join(cacheDir, 'Sparkle.framework'), framework]);
  fs.copyFileSync(sparkleNode, path.join(contents, 'Resources', 'sparkle.node'));
  console.log(`Embedded Sparkle in ${contents}`);
};
