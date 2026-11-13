// Sets the next release version in package.json and app/package.json, and
// prints it. .forgejo/workflows/release.yml runs it.
//   node bin/ci/release-version.js canary|production [version]
// canary: 4.0.0-q-canary.19 → 4.0.0-q-canary.20, 4.0.0-q → 4.0.1-q-canary.1
// production: 4.0.0-q-canary.19 → 4.0.0-q
const fs = require('fs');

const [channel, given] = process.argv.slice(2);
const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};
const files = ['package.json', 'app/package.json'];
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const current = read(files[0]).version;

function next() {
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)-(\w+)(?:-canary\.(\d+))?$/);
  if (!m) fail(`can't read version ${current}; give one`);
  const [, major, minor, patch, tag, canary] = m;
  if (channel === 'canary') {
    return canary
      ? `${major}.${minor}.${patch}-${tag}-canary.${+canary + 1}`
      : `${major}.${minor}.${+patch + 1}-${tag}-canary.1`;
  }
  if (canary) return `${major}.${minor}.${patch}-${tag}`;
  return fail(`${current} is already a production version; give one`);
}

const version = given || next();
// Publish release takes the channel from the tag, so they must agree.
if ((channel === 'canary') !== version.includes('canary')) {
  fail(`a ${channel} release can't be ${version}`);
}
for (const f of files) {
  fs.writeFileSync(f, JSON.stringify({...read(f), version}, null, 2) + '\n');
}
console.log(version);
