import type {BrowserWindow, MenuItemConstructorOptions} from 'electron';

const editMenu = (
  commandKeys: Record<string, string>,
  execCommand: (command: string, focusedWindow?: BrowserWindow) => void
) => {
  const submenu: MenuItemConstructorOptions[] = [
    {
      label: 'Undo',
      accelerator: commandKeys['editor:undo'],
      enabled: false
    },
    {
      label: 'Redo',
      accelerator: commandKeys['editor:redo'],
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Cut',
      accelerator: commandKeys['editor:cut'],
      enabled: false
    },
    {
      role: 'copy',
      command: 'editor:copy',
      accelerator: commandKeys['editor:copy'],
      registerAccelerator: true
    } as any,
    {
      role: 'paste',
      accelerator: commandKeys['editor:paste'],
      registerAccelerator: true
    },
    {
      label: 'Select All',
      accelerator: commandKeys['editor:selectAll'],
      click(item, focusedWindow) {
        execCommand('editor:selectAll', focusedWindow as BrowserWindow | undefined);
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Move to...',
      submenu: [
        {
          label: 'Previous word',
          accelerator: commandKeys['editor:movePreviousWord'],
          click(item, focusedWindow) {
            execCommand('editor:movePreviousWord', focusedWindow as BrowserWindow | undefined);
          }
        },
        {
          label: 'Next word',
          accelerator: commandKeys['editor:moveNextWord'],
          click(item, focusedWindow) {
            execCommand('editor:moveNextWord', focusedWindow as BrowserWindow | undefined);
          }
        },
        {
          label: 'Line beginning',
          accelerator: commandKeys['editor:moveBeginningLine'],
          click(item, focusedWindow) {
            execCommand('editor:moveBeginningLine', focusedWindow as BrowserWindow | undefined);
          }
        },
        {
          label: 'Line end',
          accelerator: commandKeys['editor:moveEndLine'],
          click(item, focusedWindow) {
            execCommand('editor:moveEndLine', focusedWindow as BrowserWindow | undefined);
          }
        }
      ]
    },
    {
      label: 'Delete...',
      submenu: [
        {
          label: 'Previous word',
          accelerator: commandKeys['editor:deletePreviousWord'],
          click(item, focusedWindow) {
            execCommand('editor:deletePreviousWord', focusedWindow as BrowserWindow | undefined);
          }
        },
        {
          label: 'Next word',
          accelerator: commandKeys['editor:deleteNextWord'],
          click(item, focusedWindow) {
            execCommand('editor:deleteNextWord', focusedWindow as BrowserWindow | undefined);
          }
        },
        {
          label: 'Line beginning',
          accelerator: commandKeys['editor:deleteBeginningLine'],
          click(item, focusedWindow) {
            execCommand('editor:deleteBeginningLine', focusedWindow as BrowserWindow | undefined);
          }
        },
        {
          label: 'Line end',
          accelerator: commandKeys['editor:deleteEndLine'],
          click(item, focusedWindow) {
            execCommand('editor:deleteEndLine', focusedWindow as BrowserWindow | undefined);
          }
        }
      ]
    },
    {
      type: 'separator'
    },
    {
      label: 'Clear Buffer',
      accelerator: commandKeys['editor:clearBuffer'],
      click(item, focusedWindow) {
        execCommand('editor:clearBuffer', focusedWindow as BrowserWindow | undefined);
      }
    },
    {
      label: 'Search',
      accelerator: commandKeys['editor:search'],
      click(item, focusedWindow) {
        execCommand('editor:search', focusedWindow as BrowserWindow | undefined);
      }
    }
  ];

  if (process.platform !== 'darwin') {
    submenu.push(
      {type: 'separator'},
      {
        label: 'Preferences...',
        accelerator: commandKeys['window:preferences'],
        click() {
          execCommand('window:preferences');
        }
      }
    );
  }

  return {
    label: 'Edit',
    submenu
  };
};

export default editMenu;
