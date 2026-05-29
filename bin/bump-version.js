'use strict';
const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Usage: node bin/bump-version.js <version>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const packageFiles = [
  path.join(root, 'package.json'),
  path.join(root, 'app', 'package.json'),
  path.join(root, 'target', 'package.json'),
];

for (const file of packageFiles) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  const old = pkg.version;
  pkg.version = newVersion;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`${path.relative(root, file)}: ${old} → ${newVersion}`);
}
