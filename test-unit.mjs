#!/usr/bin/env zx

import { cpSync, mkdirSync } from 'fs';
import { basename } from 'path';

$.prefix = 'set -e;';

await $`tsc -b app/tsconfig.json`.pipe(process.stdout);

await mkdirSync('dist/tmp/root/app', { recursive: true });

await cpSync(
	'target',
	'dist/tmp/root/app',
	{
		recursive: true,
		filter: function (s) {
			const b = basename(s);
			if (b === 'node_modules' || b === 'renderer') {
				return false;
			}
			return true;
		}
	}
)

await $`cross-env DEBUG=ava:watcher AVA_IMPORT_FROM_PROJECT_NO_STUB=1 ava --no-cache`.pipe(process.stdout);