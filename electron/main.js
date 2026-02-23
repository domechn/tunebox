const { app, BrowserWindow, session } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#2C2416',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      webviewTag: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Vintage Radio - YouTube Music',
    autoHideMenuBar: true,
    frame: true,
    resizable: true
  })

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`
  
  mainWindow.loadURL(startUrl)

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    callback({ requestHeaders: details.requestHeaders })
  })

  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    webContents.on('dom-ready', () => {
      const controlScript = fs.readFileSync(
        path.join(__dirname, 'ytmusic-control.js'),
        'utf8'
      )
      webContents.executeJavaScript(controlScript)
    })
  })

  mainWindow.webContents.on('did-create-window', (childWindow) => {
    childWindow.webContents.on('dom-ready', () => {
      if (childWindow.webContents.getURL().includes('music.youtube.com')) {
        const controlScript = fs.readFileSync(
          path.join(__dirname, 'ytmusic-control.js'),
          'utf8'
        )
        childWindow.webContents.executeJavaScript(controlScript)
      }
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
