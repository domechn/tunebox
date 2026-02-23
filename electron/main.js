const { app, BrowserWindow, session, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let loginWindow
let ytWebContents = null

const YTMUSIC_URL = 'https://music.youtube.com'
const YTMUSIC_PARTITION = 'persist:youtube-music'
const AUTH_HEADER_FILE = 'ytmusic-auth.json'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function getAuthFilePath() {
  return path.join(app.getPath('userData'), AUTH_HEADER_FILE)
}

function readStoredAuth() {
  try {
    const filePath = getAuthFilePath()
    if (!fs.existsSync(filePath)) {
      return null
    }

    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function persistAuthHeaders(payload) {
  const filePath = getAuthFilePath()
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

function setupYouTubeSessionHeaderCapture() {
  const ytSession = session.fromPartition(YTMUSIC_PARTITION)
  let lastAuthFingerprint = ''

  ytSession.webRequest.onBeforeSendHeaders({ urls: ['https://music.youtube.com/*', 'https://*.youtube.com/*'] }, (details, callback) => {
    details.requestHeaders['User-Agent'] = USER_AGENT

    const shouldCapture =
      details.url.includes('/youtubei/v1/') ||
      details.url.includes('/youtubei/v1/player') ||
      details.url.includes('/youtubei/v1/browse')

    if (shouldCapture) {
      const authorization = details.requestHeaders.authorization || details.requestHeaders.Authorization
      const cookie = details.requestHeaders.cookie || details.requestHeaders.Cookie
      const xGoogAuthuser = details.requestHeaders['x-goog-authuser'] || details.requestHeaders['X-Goog-AuthUser']
      const xOrigin = details.requestHeaders['x-origin'] || details.requestHeaders['X-Origin']

      if (authorization && cookie) {
        const fingerprint = `${authorization}|${xGoogAuthuser || ''}`
        if (fingerprint !== lastAuthFingerprint) {
          lastAuthFingerprint = fingerprint
          const payload = {
            capturedAt: new Date().toISOString(),
            sourceUrl: details.url,
            headers: {
              authorization,
              cookie,
              'x-goog-authuser': xGoogAuthuser || '0',
              'x-origin': xOrigin || YTMUSIC_URL,
              'user-agent': USER_AGENT
            }
          }
          persistAuthHeaders(payload)

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ytmusic-auth-updated', {
              ready: true,
              capturedAt: payload.capturedAt
            })
          }
        }
      }
    }

    callback({ requestHeaders: details.requestHeaders })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 260,
    height: 520,
    minWidth: 260,
    minHeight: 520,
    backgroundColor: '#00000000',
    transparent: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      webviewTag: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Music Player',
    autoHideMenuBar: true,
    resizable: false
  })

  const startUrl = process.env.ELECTRON_START_URL || `http://localhost:5000`
  
  mainWindow.loadURL(startUrl)

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    ytWebContents = webContents
    webContents.on('destroyed', () => { ytWebContents = null })
    webContents.on('dom-ready', () => {
      const controlScript = fs.readFileSync(
        path.join(__dirname, 'ytmusic-control.js'),
        'utf8'
      )
      webContents.executeJavaScript(controlScript)

      // Poll player state via executeJavaScript and forward to renderer over IPC.
      // window.parent.postMessage does NOT cross Electron's OOPIF process boundary,
      // so this is the only reliable way to get data back from the webview.
      let lastPollTitle = ''
      let lyricsActivated = false

      const pollTimer = setInterval(async () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          clearInterval(pollTimer)
          return
        }
        try {
          const state = await webContents.executeJavaScript(`
            (function() {
              try {
                var video = document.querySelector('video');
                var titleEl = document.querySelector('ytmusic-player-bar .title yt-formatted-string')
                           || document.querySelector('.title.style-scope.ytmusic-player-bar');
                var artistEl = document.querySelector('ytmusic-player-bar .byline yt-formatted-string a')
                            || document.querySelector('.byline.style-scope.ytmusic-player-bar a')
                            || document.querySelector('.byline.style-scope.ytmusic-player-bar');
                var thumbEl = document.querySelector('ytmusic-player-bar img.image')
                           || document.querySelector('.thumbnail img')
                           || document.querySelector('#song-image img')
                           || document.querySelector('ytmusic-player-bar img');
                if (!thumbEl || !thumbEl.src) {
                  var wrapper = document.querySelector('ytmusic-player-bar .image')
                             || document.querySelector('.thumbnail.ytmusic-player-bar');
                  if (wrapper) {
                    thumbEl = wrapper.querySelector('img') || wrapper;
                  }
                }
                var lyricsEl = document.querySelector('.description.ytmusic-description-shelf-renderer')
                            || document.querySelector('ytmusic-description-shelf-renderer .description')
                            || document.querySelector('#contents .description')
                            || document.querySelector('[class*="description-shelf"] .description');

                // Detect currently active/synced lyric line
                var currentLyric = '';
                // Method 1: Video text tracks (synced lyrics/captions)
                if (video && video.textTracks) {
                  for (var t = 0; t < video.textTracks.length; t++) {
                    var track = video.textTracks[t];
                    if (track.mode === 'disabled') track.mode = 'hidden';
                    if (track.activeCues && track.activeCues.length > 0) {
                      currentLyric = track.activeCues[0].text || '';
                      currentLyric = currentLyric.replace(/<[^>]*>/g, '').trim();
                      if (currentLyric) break;
                    }
                  }
                }

                var isPlaying = video ? !video.paused : false;
                var ct = (video && isFinite(video.currentTime)) ? video.currentTime : 0;
                var dur = (video && isFinite(video.duration)) ? video.duration : 0;

                var stateObj = {
                  title:     titleEl  ? titleEl.textContent.trim()  : '',
                  artist:    artistEl ? artistEl.textContent.trim() : '',
                  thumbnail: thumbEl ? (thumbEl.src || '') : '',
                  isPlaying: isPlaying,
                  currentTime: ct,
                  duration: dur,
                  lyrics: lyricsEl ? lyricsEl.innerText : '',
                  currentLyric: currentLyric
                };
                console.log('YTMusic State:', stateObj);
                return stateObj;
              } catch(e) { return null; }
            })()
          `)
          if (state && mainWindow && !mainWindow.isDestroyed()) {
            // console.log('YTMusic State:', state);
            mainWindow.webContents.send('ytmusic-state', state)

            // When track changes, try to activate the Lyrics tab
            if (state.title && state.title !== lastPollTitle) {
              lastPollTitle = state.title
              lyricsActivated = false
            }
            if (!lyricsActivated && state.title) {
              try {
                const clicked = await webContents.executeJavaScript(`
                  (function() {
                    // Try multiple selectors for the Lyrics tab
                    var selectors = [
                      'tp-yt-paper-tab',
                      'yt-tab-shape',
                      '[role="tab"]',
                      'ytmusic-player-page .tab-header paper-tab',
                      '.tab-header [role="tab"]'
                    ];
                    for (var s = 0; s < selectors.length; s++) {
                      var tabs = document.querySelectorAll(selectors[s]);
                      for (var i = 0; i < tabs.length; i++) {
                        var text = tabs[i].textContent.trim().toUpperCase();
                        if (text.indexOf('LYRICS') !== -1 || text.indexOf('歌词') !== -1) {
                          tabs[i].click();
                          return true;
                        }
                      }
                    }
                    return false;
                  })()
                `)
                if (clicked) lyricsActivated = true
              } catch (_) {}
            }
          }
        } catch (_) { /* page navigating or destroyed */ }
      }, 1000)

      webContents.on('destroyed', () => clearInterval(pollTimer))
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

function openLoginWindow() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus()
    return
  }

  loginWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 900,
    minHeight: 680,
    autoHideMenuBar: true,
    title: 'Sign in to YouTube Music',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: YTMUSIC_PARTITION
    }
  })

  loginWindow.loadURL(YTMUSIC_URL)

  if (process.env.NODE_ENV === 'development') {
    loginWindow.webContents.openDevTools({ mode: 'detach' })
  }

  loginWindow.on('closed', () => {
    loginWindow = null
  })
}

function registerIpcHandlers() {
  ipcMain.handle('ytmusic-auth:get-state', () => {
    const stored = readStoredAuth()
    return {
      ready: Boolean(stored?.headers?.authorization && stored?.headers?.cookie),
      capturedAt: stored?.capturedAt || null
    }
  })

  ipcMain.handle('ytmusic-auth:get-headers', () => {
    const stored = readStoredAuth()
    return stored?.headers || null
  })

  ipcMain.handle('ytmusic-auth:open-login', () => {
    openLoginWindow()
    return { opened: true }
  })

  ipcMain.handle('ytmusic-auth:logout', async () => {
    // Delete stored auth file
    try {
      const filePath = getAuthFilePath()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (_) {}
    // Clear session cookies/storage for the YouTube Music partition
    try {
      const ytSession = session.fromPartition(YTMUSIC_PARTITION)
      await ytSession.clearStorageData()
    } catch (_) {}
    return { ok: true }
  })

  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  ipcMain.handle('ytmusic-command', async (_, command, data) => {
    if (!ytWebContents || ytWebContents.isDestroyed()) return { ok: false }
    try {
      switch (command) {
        case 'play':
          await ytWebContents.executeJavaScript(`
            (function() {
              var v = document.querySelector('video');
              if (v) v.play();
            })()
          `)
          break
        case 'pause':
          await ytWebContents.executeJavaScript(`
            (function() {
              var v = document.querySelector('video');
              if (v) v.pause();
            })()
          `)
          break
        case 'next':
          await ytWebContents.executeJavaScript(`
            (function() {
              var btn = document.querySelector('.next-button')
                     || document.querySelector('[aria-label="Next"]')
                     || document.querySelector('tp-yt-paper-icon-button.next-button')
                     || document.querySelector('ytmusic-player-bar .next-button');
              if (btn) { btn.click(); return; }
              // fallback: simulate keyboard shortcut
              document.dispatchEvent(new KeyboardEvent('keydown', {key:'N',code:'KeyN',shiftKey:true,bubbles:true}));
            })()
          `)
          break
        case 'previous':
          await ytWebContents.executeJavaScript(`
            (function() {
              var btn = document.querySelector('.previous-button')
                     || document.querySelector('[aria-label="Previous"]')
                     || document.querySelector('tp-yt-paper-icon-button.previous-button')
                     || document.querySelector('ytmusic-player-bar .previous-button');
              if (btn) { btn.click(); return; }
              document.dispatchEvent(new KeyboardEvent('keydown', {key:'P',code:'KeyP',shiftKey:true,bubbles:true}));
            })()
          `)
          break
        case 'dislike':
          await ytWebContents.executeJavaScript(`
            (function() {
              var btn = document.querySelector('#dislike-button-renderer button')
                     || document.querySelector('ytmusic-like-button-renderer#like-button-renderer [aria-label*="dislike" i]')
                     || document.querySelector('[aria-label="Dislike"]')
                     || document.querySelector('ytmusic-like-button-renderer[like-status] .dislike');
              if (btn) btn.click();
            })()
          `)
          break
        case 'seek':
          if (data && typeof data.time === 'number') {
            await ytWebContents.executeJavaScript(`
              (function() {
                var v = document.querySelector('video');
                if (v) v.currentTime = ${data.time};
              })()
            `)
          }
          break
        case 'setVolume':
          if (data && typeof data.volume === 'number') {
            await ytWebContents.executeJavaScript(`
              (function() {
                var v = document.querySelector('video');
                if (v) v.volume = ${data.volume / 100};
              })()
            `)
          }
          break
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })
}

app.whenReady().then(() => {
  setupYouTubeSessionHeaderCapture()
  registerIpcHandlers()
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
