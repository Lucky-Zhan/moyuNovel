import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('moyuNovelShell', {
  onCommand(callback) {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('shell-command', listener);
    return () => ipcRenderer.removeListener('shell-command', listener);
  },
});
