import {UPDATE_INSTALL, UPDATE_AVAILABLE} from '../../typings/constants/updater';
import type {HyperActions, HyperDispatch, HyperState} from '../../typings/hyper';
import rpc from '../rpc';

export function installUpdate() {
  return (dispatch: HyperDispatch, getState: () => HyperState) => {
    dispatch({
      type: UPDATE_INSTALL,
      effect: () => {
        const {updateInstallCommand} = getState().ui;
        if (!updateInstallCommand) {
          rpc.emit('quit and install');
          return;
        }
        // Installed by a package manager: run its upgrade in a new tab, and
        // keep the tab open afterwards so the result can be read.
        const script = `${updateInstallCommand}
status=$?
echo
if [ $status -eq 0 ]; then echo 'Updated. Restart Hyper to use the new version.'; fi
printf 'Press Enter to close this tab.'
read _
exit $status`;
        rpc.emit('new', {isNewGroup: true, shell: '/bin/sh', shellArgs: ['-c', script]});
      }
    });
  };
}

export function updateAvailable(
  version: string,
  notes: string,
  releaseUrl: string,
  canInstall: boolean,
  installCommand?: string
): HyperActions {
  return {
    type: UPDATE_AVAILABLE,
    version,
    notes,
    releaseUrl,
    canInstall,
    installCommand
  };
}
