const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: async () => {
    const result = await ipcRenderer.invoke('dialog:openDirectory');
    return result;
  },
  getMediaFiles: async (folderPath) => {
    return await ipcRenderer.invoke('get-media-files', folderPath);
  },
  getMusicPath: async () => {
    return await ipcRenderer.invoke('get-music-path');
  },
  sendDSC: (data) => ipcRenderer.send('dsc', data),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  expandWindow: () => ipcRenderer.send('expand-window'),
  shrinkWindow: () => ipcRenderer.send('shrink-window')
});
