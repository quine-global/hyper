// electron-builder's afterPack, macOS: puts Sparkle.framework into the app's
// Contents/Frameworks and sparkle.node (build/mac/sparkle/hyper-sparkle.m,
// loaded by app/updater.ts) into Contents/Resources. Both are universal.
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cache = path.join(root, 'cache', 'sparkle');
const run = (cmd, args) => execFileSync(cmd, args, {stdio: 'inherit'});

exports.default = async (context) => {
  if (context.electronPlatformName !== 'darwin') return;
  // A release whose key is the placeholder could never be updated by Sparkle.
  if (
    context.packager.config.mac.extendInfo.SUPublicEDKey.startsWith('SET-ME') &&
    (process.env.GITHUB_REF || '').startsWith('refs/tags/')
  ) {
    throw new Error('embed-sparkle: set SUPublicEDKey in electron-builder.json (docs/updates.md)');
  }

  run(path.join(root, 'build/mac/sparkle/download-sparkle.sh'), [cache]);
  // node_api.h ships with Node (setup-node's include/node).
  const headers = path.join(path.dirname(process.execPath), '..', 'include', 'node');
  const module = path.join(cache, 'sparkle.node');
  run('clang', [
    ...'-bundle -undefined dynamic_lookup -fobjc-arc -arch arm64 -arch x86_64 -mmacosx-version-min=12.0'.split(' '),
    ...['-I', headers, '-framework', 'AppKit', '-o', module, path.join(root, 'build/mac/sparkle/hyper-sparkle.m')]
  ]);

  const contents = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents');
  const framework = path.join(contents, 'Frameworks', 'Sparkle.framework');
  fs.rmSync(framework, {recursive: true, force: true});
  run('ditto', [path.join(cache, 'Sparkle.framework'), framework]); // keeps its symlinks
  fs.copyFileSync(module, path.join(contents, 'Resources', 'sparkle.node'));
};
