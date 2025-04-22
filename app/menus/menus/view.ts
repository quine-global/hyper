import type {BrowserWindow, MenuItemConstructorOptions} from 'electron';

const viewMenu = (
  commandKeys: Record<string, string>,
  execCommand: (command: string, focusedWindow?: BrowserWindow) => void
): MenuItemConstructorOptions => {
  return {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: commandKeys['window:reload'],
        click(item, focusedWindow) {
          execCommand('window:reload', focusedWindow as BrowserWindow);
        }
      },
      {
        label: 'Full Reload',
        accelerator: commandKeys['window:reloadFull'],
        click(item, focusedWindow) {
          execCommand('window:reloadFull', focusedWindow as BrowserWindow);
        }
      },
      {
        label: 'Developer Tools',
        accelerator: commandKeys['window:devtools'],
        click: (item, focusedWindow) => {
          execCommand('window:devtools', focusedWindow as BrowserWindow);
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Reset Zoom Level',
        accelerator: commandKeys['zoom:reset'],
        click(item, focusedWindow) {
          execCommand('zoom:reset', focusedWindow as BrowserWindow);
        }
      },
      {
        label: 'Zoom In',
        accelerator: commandKeys['zoom:in'],
        click(item, focusedWindow) {
          execCommand('zoom:in', focusedWindow as BrowserWindow);
        }
      },
      {
        label: 'Zoom Out',
        accelerator: commandKeys['zoom:out'],
        click(item, focusedWindow) {
          execCommand('zoom:out', focusedWindow as BrowserWindow);
        }
      }
    ]
  };
};

export default viewMenu;
