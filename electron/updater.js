const { autoUpdater } = require('electron-updater')
const { ipcMain } = require('electron')

let mainWindow = null

function initAutoUpdater(win) {
  mainWindow = win

  // Don't auto-download — let the user decide
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Logger (uses console in dev, electron-log in prod if available)
  autoUpdater.logger = console

  // ── Events forwarded to renderer ──────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update-checking', {})
  })

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update-not-available', {})
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update-download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('update-downloaded', {
      version: info.version,
    })
  })

  autoUpdater.on('error', (err) => {
    sendToRenderer('update-error', {
      message: err?.message || String(err),
    })
  })

  // ── IPC handlers ──────────────────────────────────────────────
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, version: result?.updateInfo?.version }
    } catch (err) {
      return { ok: false, error: err?.message || String(err) }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || String(err) }
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  // Check for updates after a short delay (let the app finish loading)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 5000)
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

module.exports = { initAutoUpdater }
