import {existsSync} from 'fs';

// Every process running inside a Flatpak sandbox has FLATPAK_ID set and
// a /.flatpak-info file bind-mounted in, regardless of runtime or app.
export const isFlatpak = (): boolean => Boolean(process.env.FLATPAK_ID) || existsSync('/.flatpak-info');
