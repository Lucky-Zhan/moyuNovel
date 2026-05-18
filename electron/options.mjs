export const SHELL_COMMANDS = new Set([
  'import-file',
  'import-folder',
  'reset-window',
  'clear-library',
  'reset-preferences',
  'open-data-folder',
]);

export function buildWindowOptions(preloadPath, windowState = {}) {
  return {
    width: windowState.width || 1365,
    height: windowState.height || 768,
    x: windowState.x,
    y: windowState.y,
    minWidth: 900,
    minHeight: 620,
    title: 'moyuNovel',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
}

export function isSupportedShellCommand(command) {
  return SHELL_COMMANDS.has(command);
}
