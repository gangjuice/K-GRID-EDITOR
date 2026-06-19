const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectPdfFiles:      ()         => ipcRenderer.invoke('select-pdf-files'),
  parsePdf:            (filePath) => ipcRenderer.invoke('parse-pdf', filePath),
  loadConfig:          ()         => ipcRenderer.invoke('load-config'),
  saveConfig:          (cfg)      => ipcRenderer.invoke('save-config', cfg),
  postToIntranet:      (params)   => ipcRenderer.invoke('post-to-intranet', params),
  openIntranetBrowser: (url)      => ipcRenderer.invoke('open-intranet-browser', url),
})
