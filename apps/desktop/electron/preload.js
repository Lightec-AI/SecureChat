const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('secureChatDesktop', {
  platform: process.platform,
  versions: process.versions,
  workspace: {
    get: () => ipcRenderer.invoke('desktop:workspace:get'),
    choose: () => ipcRenderer.invoke('desktop:workspace:choose'),
    list: (relativePath = '.') => ipcRenderer.invoke('desktop:workspace:list', relativePath),
    readText: (relativePath) => ipcRenderer.invoke('desktop:workspace:readText', relativePath),
    writeText: (relativePath, content) =>
      ipcRenderer.invoke('desktop:workspace:writeText', relativePath, content),
  },
});
