import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWindowOptions, isSupportedShellCommand } from './options.mjs';
import { DEFAULT_WINDOW_STATE, mergeWindowState, readWindowState, writeWindowState } from './window-state.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

let mainWindow;

async function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.mjs');
  const windowState = await readWindowState(app.getPath('userData'));
  mainWindow = new BrowserWindow(buildWindowOptions(preloadPath, windowState));
  if (windowState.isMaximized) mainWindow.maximize();
  buildMenu();

  await mainWindow.loadFile(path.join(rootDir, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('resize', saveCurrentWindowState);
  mainWindow.on('move', saveCurrentWindowState);
  mainWindow.on('maximize', saveCurrentWindowState);
  mainWindow.on('unmaximize', saveCurrentWindowState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendShellCommand(command) {
  if (!mainWindow || !isSupportedShellCommand(command)) return;
  if (command === 'reset-window') {
    mainWindow.unmaximize();
    mainWindow.setSize(DEFAULT_WINDOW_STATE.width, DEFAULT_WINDOW_STATE.height);
    mainWindow.center();
    saveCurrentWindowState();
    return;
  }
  if (command === 'open-data-folder') {
    shell.openPath(app.getPath('userData'));
    return;
  }
  mainWindow.webContents.send('shell-command', command);
}

function saveCurrentWindowState() {
  if (!mainWindow) return;
  const nextState = mergeWindowState(DEFAULT_WINDOW_STATE, mainWindow.getBounds(), mainWindow.isMaximized());
  writeWindowState(app.getPath('userData'), nextState).catch(() => {});
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: '文件',
      submenu: [
        { label: '导入 TXT', accelerator: 'CmdOrCtrl+O', click: () => sendShellCommand('import-file') },
        { label: '导入文件夹', accelerator: 'CmdOrCtrl+Shift+O', click: () => sendShellCommand('import-folder') },
        { type: 'separator' },
        { label: '清空书库', click: () => sendShellCommand('clear-library') },
        { label: '重置阅读偏好', click: () => sendShellCommand('reset-preferences') },
        { label: '打开数据目录', click: () => sendShellCommand('open-data-folder') },
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    {
      label: '查看',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { label: '重置窗口', click: () => sendShellCommand('reset-window') },
      ],
    },
    {
      label: '窗口',
      submenu: [{ role: 'minimize', label: '最小化' }, { role: 'close', label: '关闭' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
