const { execSync } = require("child_process");
const pkg = require("../package.json");

const version = pkg.devDependencies.electron;
if (!version) {
  console.error("Electron not found in devDependencies.");
  process.exit(1);
}

process.env.ELECTRON_CUSTOM_VERSION = version;
execSync("node node_modules/electron-mksnapshot/download-mksnapshot.js", { stdio: "inherit" });
execSync("node bin/mk-snapshot.js", { stdio: "inherit" });
