const { execSync } = require("child_process");
const arch = process.arch;

if (arch === "arm64") {
  console.log("Running snapshot for x64 (Rosetta build)...");
  execSync("cross-env npm_config_arch=x64 yarn run v8-snapshot:arch", { stdio: "inherit" });
}

console.log(`Running snapshot for native arch: ${arch}...`);
execSync("cross-env npm_config_arch=" + arch + " yarn run v8-snapshot:arch", { stdio: "inherit" });
