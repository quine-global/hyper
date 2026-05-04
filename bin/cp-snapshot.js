
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const {Arch} = require('electron-builder');

function copySnapshot(pathToElectron, archToCopy) {
  const snapshotFileName = 'snapshot_blob.bin';
  const v8ContextFileName = getV8ContextFileName(archToCopy);
  const pathToBlob = path.resolve(__dirname, '..', 'cache', archToCopy, snapshotFileName);
  const pathToBlobV8 = path.resolve(__dirname, '..', 'cache', archToCopy, v8ContextFileName);

  console.log('Copying v8 snapshots from', pathToBlob, 'to', pathToElectron);
  fs.mkdirSync(pathToElectron, { recursive: true });
  fs.copyFileSync(pathToBlob, path.join(pathToElectron, snapshotFileName));
  fs.copyFileSync(pathToBlobV8, path.join(pathToElectron, v8ContextFileName));
}

function getPathToElectron() {
  const electronPath = require.resolve('electron');

  switch (process.platform) {
    case 'darwin':
      return path.resolve(
        electronPath,
        '..',
        '..',
        '..',
        'dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources'
      );
    case 'win32':
    case 'linux':
      return path.resolve(electronPath, '..', '..', '..', 'dist');
  }
}


function getV8ContextFileName(archToCopy) {
  return `snapshot_blob.bin`;
}

exports.default = async (context) => {
  const archToCopy = Arch[context.arch];
  const pathToElectron =
    process.platform === 'darwin'
      ? `${context.appOutDir}/Hyper.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources`
      : context.appOutDir;
  copySnapshot(pathToElectron, archToCopy);
  useLoaderScriptFix(context);
};

if (require.main === module) {
  const archToCopy = process.env.SNAPSHOT_TARGET_ARCH ?? process.env.npm_config_arch;
  const pathToElectron = getPathToElectron();
  if ((process.arch.startsWith('arm') ? 'arm64' : 'x64') === archToCopy) {
    copySnapshot(pathToElectron, archToCopy);
  }
}


// copied and modified from https://github.com/gergof/electron-builder-sandbox-fix/blob/master/lib/index.js
// copied and modified from https://github.com/Adamant-im/adamant-im/blob/7b20272a717833ffb0b49b034ab9974118fc59ec/scripts/electron/sandboxFix.js

const useLoaderScriptFix = async (params) => {
  if (params.electronPlatformName !== 'linux') {
    // this fix is only required on linux
    return
  }

  const executable = path.join(params.appOutDir, params.packager.executableName)

  const loaderScript = `#!/usr/bin/env bash
set -u
SCRIPT_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
exec "$SCRIPT_DIR/${params.packager.executableName}.bin" "--no-sandbox" "$@"
`

  try {
    await fsPromises.rename(executable, executable + '.bin')
    await fsPromises.writeFile(executable, loaderScript)
    await fsPromises.chmod(executable, 0o755)
  } catch (e) {
    console.error('failed to create loader for sandbox fix: ' + e.message)
    throw new Error('Failed to create loader for sandbox fix')
  }

  console.log('sandbox fix successfully applied')
}