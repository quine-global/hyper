'use strict';
const {execSync, spawnSync} = require('child_process');

const args = process.argv.slice(2);

if (process.platform === 'win32') {
  // MSBuild's build-server node reuse calls AssignProcessToJobObject, which
  // fails with ERROR_INVALID_PARAMETER (87) inside Parallels because the VM
  // job object doesn't have JOB_OBJECT_LIMIT_BREAKAWAY_OK set.
  process.env.MSBUILDDISABLENODEREUSE = '1';

  const cwd = process.cwd();
  if (cwd.startsWith('\\\\')) {
    try {
      const netUse = execSync('net use', {encoding: 'utf8'});
      for (const line of netUse.split(/\r?\n/)) {
        const m = line.match(/\b([A-Z]:)\s+(\\\\[^\s]+)/i);
        if (m) {
          const [, letter, unc] = m;
          if (cwd.toLowerCase().startsWith(unc.toLowerCase())) {
            const normalized = letter + cwd.slice(unc.length);
            process.chdir(normalized);
            break;
          }
        }
      }
    } catch (_) {}
  }
}

const result = spawnSync(args[0], args.slice(1), {stdio: 'inherit', shell: true});
process.exit(result.status ?? 0);
