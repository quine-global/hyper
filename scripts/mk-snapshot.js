const { execSync } = require("child_process");
const pkg = require("../package.json");
const path = require("path");
const pnp = require("pnpapi");

const version = pkg.devDependencies.electron;
if (!version) {
  console.error("Electron not found in devDependencies.");
  process.exit(1);
}

process.env.ELECTRON_CUSTOM_VERSION = version;


const downloadScript = pnp.resolveToUnqualified("electron-mksnapshot/download-mksnapshot.js", __filename);
const mkSnapshotScript = path.resolve(__dirname, "../bin/mk-snapshot.js");

execSync(`node ${downloadScript}`, {
  stdio: "inherit",
});
execSync(`node ${mkSnapshotScript}`, { stdio: "inherit" });
