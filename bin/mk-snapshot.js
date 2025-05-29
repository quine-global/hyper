const childProcess = require('child_process');
const vm = require('vm');
const path = require('path');
const fs = require('fs');
const electronLink = require('electron-link');
const {mkdirp} = require('fs-extra');
const pnp = require("pnpapi");

const excludedModules = {};

const crossArchDirs = ['clang_x86_v8_arm', 'clang_x64_v8_arm64', 'win_clang_x64'];

const archMap = {
  x64: 'x86_64',
  arm64: 'arm64'
};

async function main() {
  const npmConfigArch = process.env.npm_config_arch;
  if (!npmConfigArch) {
    throw new Error('env var npm_config_arch is not specified')
  }


  const baseDirPath = path.resolve(__dirname, '..');

  console.log('Creating a linked script..');
  const result = await electronLink({
    baseDirPath: baseDirPath,
    mainPath: `${__dirname}/snapshot-libs.js`,
    cachePath: `${baseDirPath}/cache`,
    // eslint-disable-next-line no-prototype-builtins
    shouldExcludeModule: (modulePath) => excludedModules.hasOwnProperty(modulePath)
  });

  const snapshotScriptPath = `${baseDirPath}/cache/snapshot-libs.js`;
  fs.writeFileSync(snapshotScriptPath, result.snapshotScript);

  // Verify if we will be able to use this in `mksnapshot`
  vm.runInNewContext(result.snapshotScript, undefined, {filename: snapshotScriptPath, displayErrors: true});

  const outputBlobPath = `${baseDirPath}/cache/${npmConfigArch}`;
  await mkdirp(outputBlobPath);

  const baseDir = pnp.resolveToUnqualified("electron-mksnapshot", __filename);
  const mksnapshotBinPath = path.resolve(baseDir, "bin", "mksnapshot" + (process.platform === "win32" ? ".exe" : ""));

  if (process.platform !== 'darwin') {
    // TODO non-darwin
    const matchingDirs = crossArchDirs.map((dir) => `${mksnapshotBinPath}/${dir}`).filter((dir) => fs.existsSync(dir));
    for (const dir of matchingDirs) {
      if (fs.existsSync(`${mksnapshotBinPath}/gen/v8/embedded.S`)) {
        await mkdirp(`${dir}/gen/v8`);
        fs.copyFileSync(`${mksnapshotBinPath}/gen/v8/embedded.S`, `${dir}/gen/v8/embedded.S`);
      }
    }
  }

  const startupBlobPath = path.join(outputBlobPath, 'snapshot_blob.bin');

  console.log(`Generating startup blob in "${outputBlobPath}"`);
  const res = childProcess.execFileSync(
    require.resolve(`electron-mksnapshot/bin/mksnapshot${process.platform === 'win32' ? '.exe' : ''}`),
    [
      '--startup-src=' + snapshotScriptPath,
      '--startup-blob=' + startupBlobPath,
      `--target-arch=${archMap[process.env.npm_config_arch]}`,
      //'--v8-context-snapshot=' + v8SnapshotPath
    ]
  );
  console.log('result:', res.toString())
}

main().catch((err) => console.error(err));
