const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  listImages: (folder) => ipcRenderer.invoke('list-images', folder),
});
document.addEventListener('mousedown', () => ipcRenderer.send('exit-screensaver'));
