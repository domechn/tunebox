const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  version: process.versions.electron,
  openYouTubeMusicLogin: () => ipcRenderer.invoke('ytmusic-auth:open-login'),
  getYouTubeMusicAuthState: () => ipcRenderer.invoke('ytmusic-auth:get-state'),
  getYouTubeMusicAuthHeaders: () => ipcRenderer.invoke('ytmusic-auth:get-headers'),
  onYouTubeMusicAuthUpdated: (callback) => {
    const handler = (_, payload) => callback(payload)
    ipcRenderer.on('ytmusic-auth-updated', handler)
    return () => ipcRenderer.removeListener('ytmusic-auth-updated', handler)
  },
  onYouTubeMusicState: (callback) => {
    const handler = (_, payload) => callback(payload)
    ipcRenderer.on('ytmusic-state', handler)
    return () => ipcRenderer.removeListener('ytmusic-state', handler)
  },
  sendCommand: (command, data) => ipcRenderer.invoke('ytmusic-command', command, data),
  logout: () => ipcRenderer.invoke('ytmusic-auth:logout'),
  quit: () => ipcRenderer.invoke('app:quit'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (callback) => {
    const handler = (_, payload) => callback(payload)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_, payload) => callback(payload)
    ipcRenderer.on('update-downloaded', handler)
    return () => ipcRenderer.removeListener('update-downloaded', handler)
  },
  onDownloadProgress: (callback) => {
    const handler = (_, payload) => callback(payload)
    ipcRenderer.on('update-download-progress', handler)
    return () => ipcRenderer.removeListener('update-download-progress', handler)
  },
  onUpdateError: (callback) => {
    const handler = (_, payload) => callback(payload)
    ipcRenderer.on('update-error', handler)
    return () => ipcRenderer.removeListener('update-error', handler)
  }
})
