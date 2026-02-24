const { app, BrowserWindow, session, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let loginWindow
let ytWebContents = null
let webviewWebContents = null   // Always the renderer's webview (for recommendations)
let activeExtraWin = null       // Hidden BrowserWindow currently playing (after preload swap)
let preloadWin = null           // Hidden BrowserWindow preloading next track
let preloadUrl = null           // URL being preloaded
let preloadReady = false        // Preload video is buffered and paused
let lastKnownVolume = 0.7      // Last setVolume value (0-1), for preload window setup

const YTMUSIC_URL = 'https://music.youtube.com'
const YTMUSIC_PARTITION = 'persist:youtube-music'
const AUTH_HEADER_FILE = 'ytmusic-auth.json'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function resolveAppIconPath() {
  const ext = process.platform === 'win32' ? 'ico' : 'png'
  const candidates = [
    path.join(__dirname, '..', 'build', `icon.${ext}`),
    path.join(process.resourcesPath, 'build', `icon.${ext}`)
  ]

  for (const iconPath of candidates) {
    if (fs.existsSync(iconPath)) {
      return iconPath
    }
  }

  return undefined
}

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

function isStoredAuthFresh(stored, maxAgeMs = 1000 * 60 * 60 * 12) {
  if (!stored?.capturedAt) return false
  const capturedAtMs = Date.parse(stored.capturedAt)
  if (Number.isNaN(capturedAtMs)) return false
  return Date.now() - capturedAtMs <= maxAgeMs
}

async function hasYouTubeSessionCookies() {
  try {
    const ytSession = session.fromPartition(YTMUSIC_PARTITION)
    const cookies = await ytSession.cookies.get({ url: YTMUSIC_URL })
    const cookieNames = new Set(cookies.map((cookie) => cookie.name))
    return (
      cookieNames.has('SAPISID') ||
      cookieNames.has('__Secure-3PAPISID') ||
      cookieNames.has('SID')
    )
  } catch {
    return false
  }
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

          if (loginWindow && !loginWindow.isDestroyed()) {
            loginWindow.close()
          }

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

function resolveRendererEntry() {
  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173'

  if (!app.isPackaged) {
    return { type: 'url', value: devUrl }
  }

  const candidates = [
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
    path.join(process.resourcesPath, 'dist', 'index.html')
  ]

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return { type: 'file', value: filePath }
    }
  }

  return { type: 'url', value: devUrl }
}

// ─── Preload helpers ──────────────────────────────────────────────

function createHiddenPlaybackWindow() {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: YTMUSIC_PARTITION,
      webSecurity: true
    }
  })
  win.webContents.setUserAgent(USER_AGENT)
  return win
}

// Inject control scripts + volume interception + video event listeners into a webContents.
// Called on the renderer's webview (dom-ready) and on preload windows.
function setupPlaybackScripts(wc) {
  const controlScript = fs.readFileSync(path.join(__dirname, 'ytmusic-control.js'), 'utf8')
  wc.executeJavaScript(controlScript)

  wc.executeJavaScript(`
    (function() {
      if (typeof window.__tuneboxDesiredVolume === 'undefined') {
        window.__tuneboxDesiredVolume = null;
      }
      if (typeof window.__tuneboxSelfSetting === 'undefined') {
        window.__tuneboxSelfSetting = false;
      }
      var origDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
      if (origDescriptor && !HTMLMediaElement.prototype.__tuneboxIntercepted) {
        HTMLMediaElement.prototype.__tuneboxIntercepted = true;
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
          get: origDescriptor.get,
          set: function(v) {
            if (!window.__tuneboxSelfSetting && window.__tuneboxDesiredVolume !== null) {
              origDescriptor.set.call(this, window.__tuneboxDesiredVolume);
            } else {
              origDescriptor.set.call(this, v);
            }
          },
          configurable: true
        });
      }
      function enforceVolume(video) {
        if (window.__tuneboxDesiredVolume === null) return;
        window.__tuneboxSelfSetting = true;
        try { video.volume = window.__tuneboxDesiredVolume; } finally { window.__tuneboxSelfSetting = false; }
      }
      function setupVideoListeners() {
        var video = document.querySelector('video');
        if (!video) return;
        if (video.__tuneboxListenersSet) return;
        video.__tuneboxListenersSet = true;
        video.addEventListener('ended', function() { window.__tuneboxVideoEnded = true; });
        video.addEventListener('play', function() { window.__tuneboxVideoEnded = false; enforceVolume(video); });
        video.addEventListener('loadeddata', function() { enforceVolume(video); });
        video.addEventListener('canplay', function() { enforceVolume(video); });
        enforceVolume(video);
      }
      setupVideoListeners();
      setInterval(setupVideoListeners, 3000);
    })()
  `)
}

function createWindow() {
  const appIconPath = resolveAppIconPath()

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
    title: 'TuneBox',
    autoHideMenuBar: true,
    resizable: false,
    icon: appIconPath
  })

  const rendererEntry = resolveRendererEntry()

  if (rendererEntry.type === 'file') {
    mainWindow.loadFile(rendererEntry.value)
  } else {
    mainWindow.loadURL(rendererEntry.value)
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  let activePollTimer = null

  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    ytWebContents = webContents
    webviewWebContents = webContents
    webContents.on('destroyed', () => {
      if (ytWebContents === webContents) ytWebContents = null
      if (webviewWebContents === webContents) webviewWebContents = null
    })
    webContents.on('dom-ready', () => {
      // Clear any previous poll timer to avoid duplicates on page reload
      if (activePollTimer) {
        clearInterval(activePollTimer)
        activePollTimer = null
      }

      setupPlaybackScripts(webContents)

      // Poll player state via executeJavaScript and forward to renderer over IPC.
      // window.parent.postMessage does NOT cross Electron's OOPIF process boundary,
      // so this is the only reliable way to get data back from the webview.
      let recsPollCounter = 0

      const pollTimer = setInterval(async () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          clearInterval(pollTimer)
          return
        }
        if (!ytWebContents || ytWebContents.isDestroyed()) return
        try {
          const state = await ytWebContents.executeJavaScript(`
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
                var isPlaying = video ? !video.paused : false;
                var ct = 0;
                var dur = 0;
                var progressBar = document.querySelector('#progress-bar') || document.querySelector('ytmusic-player-bar tp-yt-paper-slider');
                if (progressBar) {
                  ct = parseFloat(progressBar.getAttribute('value') || '0');
                  dur = parseFloat(progressBar.getAttribute('aria-valuemax') || '0');
                } else if (video) {
                  ct = isFinite(video.currentTime) ? video.currentTime : 0;
                  dur = isFinite(video.duration) ? video.duration : 0;
                }

                var normalized = function(text) {
                  return (text || '').replace(/\\s+/g, '').toLowerCase();
                };

                var pickText = function(el) {
                  return el ? (el.textContent || '').trim() : '';
                };

                // ── Scrape ALL homepage shelves (not only 猜你喜欢) ──
                var allPlaylists = [];
                var shelves = Array.from(document.querySelectorAll('ytmusic-shelf-renderer, ytmusic-carousel-shelf-renderer'));
                for (var k = 0; k < shelves.length; k++) {
                  var shelfRoot = shelves[k];
                  var shelfTitleEl = shelfRoot.querySelector('h2, .title, yt-formatted-string.title');
                  var shelfTitle = pickText(shelfTitleEl) || 'Untitled Shelf';
                  var shelfItems = Array.from(shelfRoot.querySelectorAll(
                    'ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer, ytmusic-compact-station-renderer'
                  ));
                  var tracksInShelf = [];

                  for (var m = 0; m < shelfItems.length; m++) {
                    var shelfItem = shelfItems[m];
                    var shelfItemTitle = pickText(shelfItem.querySelector('#title, .title, yt-formatted-string.title, a[title], a#video-title'));
                    var shelfItemArtist = pickText(shelfItem.querySelector('#subtitle, .subtitle, .byline, yt-formatted-string.subtitle, .details'));
                    var shelfItemLink = shelfItem.querySelector('a[href*="watch"], a[href*="playlist"], a[href*="browse"], a[href]');
                    var shelfItemThumb = shelfItem.querySelector('img');

                    if (!shelfItemTitle && shelfItemLink) {
                      shelfItemTitle = shelfItemLink.getAttribute('title') || pickText(shelfItemLink);
                    }
                    // Only include items with a direct watch?v= link (actual songs)
                    if (!shelfItemTitle) continue;
                    var shelfItemUrl = shelfItemLink ? shelfItemLink.href : '';
                    if (shelfItemUrl && shelfItemUrl.indexOf('watch') === -1) continue;

                    tracksInShelf.push({
                      title: shelfItemTitle,
                      artist: shelfItemArtist,
                      url: shelfItemUrl,
                      thumbnail: shelfItemThumb ? (shelfItemThumb.src || '') : ''
                    });
                  }

                  // Deduplicate by URL/title
                  var deduped = [];
                  var seen = new Set();
                  for (var n = 0; n < tracksInShelf.length; n++) {
                    var trackKey = (tracksInShelf[n].url || '') + '|' + normalized(tracksInShelf[n].title || '');
                    if (seen.has(trackKey)) continue;
                    seen.add(trackKey);
                    deduped.push(tracksInShelf[n]);
                  }

                  if (deduped.length > 0) {
                    allPlaylists.push({
                      title: shelfTitle,
                      tracks: deduped
                    });
                  }
                }

                // ── Scrape "Up Next" / autoplay queue (watch page) ──
                var upNextTracks = [];
                var queueItems = Array.from(document.querySelectorAll(
                  'ytmusic-player-queue-item, '
                  + 'ytmusic-queue #contents ytmusic-responsive-list-item-renderer, '
                  + '#automix-contents ytmusic-responsive-list-item-renderer, '
                  + '#queue-content ytmusic-responsive-list-item-renderer, '
                  + 'ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_QUEUE"] ytmusic-responsive-list-item-renderer'
                ));
                for (var qi = 0; qi < queueItems.length; qi++) {
                  var qItem = queueItems[qi];
                  var qTitle = pickText(qItem.querySelector('.song-title, .title, yt-formatted-string.title, a[title]'));
                  var qArtist = pickText(qItem.querySelector('.byline, .subtitle, .secondary-flex-columns yt-formatted-string'));
                  var qThumb = qItem.querySelector('img');
                  // Extract videoId from the queue item's data or link
                  var qUrl = '';
                  var qLink = qItem.querySelector('a[href*="watch"]');
                  if (qLink) {
                    qUrl = qLink.href;
                  } else {
                    // ytmusic-player-queue-item stores videoId in attributes or data
                    var qVideoId = qItem.getAttribute('video-id')
                                || (qItem.__data && qItem.__data.data && qItem.__data.data.videoId)
                                || '';
                    if (qVideoId) qUrl = 'https://music.youtube.com/watch?v=' + qVideoId;
                  }
                  if (!qTitle || !qUrl) continue;
                  upNextTracks.push({
                    title: qTitle,
                    artist: qArtist,
                    url: qUrl,
                    thumbnail: qThumb ? (qThumb.src || '') : ''
                  });
                }
                // Dedup up-next
                if (upNextTracks.length > 0) {
                  var unSeen = new Set();
                  upNextTracks = upNextTracks.filter(function(t) {
                    var key = (t.url || '') + '|' + normalized(t.title || '');
                    if (unSeen.has(key)) return false;
                    unSeen.add(key);
                    return true;
                  });
                }

                // Combine recommendedTracks from the first shelf that has any (legacy compat)
                var recommendedTracks = allPlaylists.length > 0 ? allPlaylists[0].tracks : [];

                var videoEnded = !!(window.__tuneboxVideoEnded);
                if (videoEnded) window.__tuneboxVideoEnded = false;

                var stateObj = {
                  title:     titleEl  ? titleEl.textContent.trim()  : '',
                  artist:    artistEl ? artistEl.textContent.trim() : '',
                  thumbnail: thumbEl ? (thumbEl.src || '') : '',
                  isPlaying: isPlaying,
                  currentTime: ct,
                  duration: dur,
                  videoEnded: videoEnded,
                  recommendedTracks: recommendedTracks,
                  allPlaylists: allPlaylists,
                  upNextTracks: upNextTracks
                };
                return stateObj;
              } catch(e) { return null; }
            })()
          `)
          // Periodically merge homepage recommendations from the webview when
          // playback source has been swapped to a hidden preload window
          if (state && webviewWebContents && webviewWebContents !== ytWebContents && !webviewWebContents.isDestroyed()) {
            recsPollCounter++
            if (recsPollCounter % 3 === 0) {
              try {
                const recsState = await webviewWebContents.executeJavaScript(`
                  (function() {
                    try {
                      var pickText = function(el) { return el ? (el.textContent || '').trim() : '' };
                      var normalized = function(text) { return (text || '').replace(/\\s+/g, '').toLowerCase() };
                      var allPlaylists = [];
                      var shelves = Array.from(document.querySelectorAll('ytmusic-shelf-renderer, ytmusic-carousel-shelf-renderer'));
                      for (var k = 0; k < shelves.length; k++) {
                        var shelfRoot = shelves[k];
                        var shelfTitleEl = shelfRoot.querySelector('h2, .title, yt-formatted-string.title');
                        var shelfTitle = pickText(shelfTitleEl) || 'Untitled Shelf';
                        var shelfItems = Array.from(shelfRoot.querySelectorAll(
                          'ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer, ytmusic-compact-station-renderer'
                        ));
                        var tracksInShelf = [];
                        for (var m = 0; m < shelfItems.length; m++) {
                          var item = shelfItems[m];
                          var iTitle = pickText(item.querySelector('#title, .title, yt-formatted-string.title, a[title], a#video-title'));
                          var iArtist = pickText(item.querySelector('#subtitle, .subtitle, .byline, yt-formatted-string.subtitle, .details'));
                          var iLink = item.querySelector('a[href*="watch"]');
                          var iThumb = item.querySelector('img');
                          if (!iTitle) continue;
                          var iUrl = iLink ? iLink.href : '';
                          if (iUrl && iUrl.indexOf('watch') === -1) continue;
                          tracksInShelf.push({ title: iTitle, artist: iArtist, url: iUrl, thumbnail: iThumb ? (iThumb.src || '') : '' });
                        }
                        if (tracksInShelf.length > 0) allPlaylists.push({ title: shelfTitle, tracks: tracksInShelf });
                      }
                      return { allPlaylists: allPlaylists };
                    } catch(e) { return null; }
                  })()
                `)
                if (recsState && Array.isArray(recsState.allPlaylists) && recsState.allPlaylists.length > 0) {
                  state.allPlaylists = [...(state.allPlaylists || []), ...recsState.allPlaylists]
                  if (!state.recommendedTracks || state.recommendedTracks.length === 0) {
                    state.recommendedTracks = recsState.allPlaylists[0].tracks || []
                  }
                }
              } catch (_recsErr) { /* webview navigating or not ready */ }
            }
          }

          if (state && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ytmusic-state', state)
          }
        } catch (_) { /* page navigating or destroyed */ }
      }, 1000)

      activePollTimer = pollTimer
      webContents.on('destroyed', () => {
        clearInterval(pollTimer)
        if (activePollTimer === pollTimer) activePollTimer = null
      })
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
  ipcMain.handle('ytmusic-auth:get-state', async () => {
    const stored = readStoredAuth()
    const storedReady = Boolean(stored?.headers?.authorization && stored?.headers?.cookie)
    const fresh = isStoredAuthFresh(stored)
    const sessionReady = await hasYouTubeSessionCookies()
    const ready = storedReady && fresh && sessionReady

    if (!ready && stored && !sessionReady) {
      try {
        const filePath = getAuthFilePath()
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (_) {}
    }

    return {
      ready,
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
      await ytSession.clearStorageData({
        storages: [
          'cookies',
          'filesystem',
          'indexdb',
          'localstorage',
          'shadercache',
          'websql',
          'serviceworkers',
          'cachestorage'
        ]
      })
      await ytSession.clearCache()
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
            const vol01 = data.volume / 100
            lastKnownVolume = vol01
            await ytWebContents.executeJavaScript(`
              (function() {
                window.__tuneboxDesiredVolume = ${vol01};
                var v = document.querySelector('video');
                if (v) {
                  window.__tuneboxSelfSetting = true;
                  try { v.volume = ${vol01}; } finally { window.__tuneboxSelfSetting = false; }
                }
              })()
            `)
          }
          break
        case 'playTrack':
          if (data && data.url) {
            // Check if this URL was preloaded and is ready
            if (preloadReady && preloadUrl === data.url && preloadWin && !preloadWin.isDestroyed()) {
              // ── Swap to preloaded window (instant playback) ──
              // 1. Mute and pause old active source
              if (ytWebContents && !ytWebContents.isDestroyed()) {
                ytWebContents.setAudioMuted(true)
                ytWebContents.executeJavaScript('var v=document.querySelector("video");if(v)v.pause();').catch(() => {})
              }
              // 2. Destroy previous hidden playback window if any
              if (activeExtraWin && !activeExtraWin.isDestroyed()) {
                activeExtraWin.destroy()
              }
              // 3. Promote preloaded window to active
              activeExtraWin = preloadWin
              ytWebContents = preloadWin.webContents
              preloadWin = null
              preloadUrl = null
              preloadReady = false
              // 4. Unmute and resume playback with correct volume
              ytWebContents.setAudioMuted(false)
              const swapVol = lastKnownVolume
              await ytWebContents.executeJavaScript(`
                (function() {
                  window.__tuneboxDesiredVolume = ${swapVol};
                  window.__tuneboxSelfSetting = true;
                  var v = document.querySelector('video');
                  if (v) {
                    try { v.volume = ${swapVol}; } finally { window.__tuneboxSelfSetting = false; }
                    v.play();
                  }
                })()
              `)
              // 5. Navigate the old webview back to homepage for recommendations
              if (webviewWebContents && webviewWebContents !== ytWebContents && !webviewWebContents.isDestroyed()) {
                webviewWebContents.setAudioMuted(true)
                webviewWebContents.loadURL('https://music.youtube.com').catch(() => {})
              }
            } else {
              // ── Normal navigation (preload miss) ──
              // Cancel stale preload if URL doesn't match
              if (preloadWin && !preloadWin.isDestroyed() && preloadUrl !== data.url) {
                preloadWin.destroy()
                preloadWin = null
                preloadUrl = null
                preloadReady = false
              }
              const safeUrl = JSON.stringify(data.url)
              // 1. Immediately pause current playback & clear ended flag
              await ytWebContents.executeJavaScript(`
                (function() {
                  var v = document.querySelector('video');
                  if (v) v.pause();
                  window.__tuneboxVideoEnded = false;
                })()
              `)
              // 2. Navigate to the new track
              await ytWebContents.executeJavaScript(`
                (function() {
                  var url = ${safeUrl};
                  var match = url.match(/[?&]v=([^&]+)/);
                  if (match) {
                    var videoId = match[1];
                    var watchPath = '/watch?v=' + videoId;
                    var fullUrl = 'https://music.youtube.com' + watchPath;
                    var app = document.querySelector('ytmusic-app');
                    if (app && typeof app.navigate_ === 'function') {
                      app.navigate_(watchPath);
                      setTimeout(function() {
                        var v = document.querySelector('video');
                        if (!v || v.paused) window.location.href = fullUrl;
                      }, 5000);
                      return;
                    }
                    var router = document.querySelector('yt-navigation-manager');
                    if (router && typeof router.navigate === 'function') {
                      router.navigate(watchPath);
                      setTimeout(function() {
                        var v = document.querySelector('video');
                        if (!v || v.paused) window.location.href = fullUrl;
                      }, 5000);
                      return;
                    }
                    window.location.href = fullUrl;
                  } else {
                    window.location.href = url;
                  }
                })()
              `)
            }
          }
          break
        case 'preloadTrack':
          if (data && data.url) {
            // Destroy existing preload window if any
            if (preloadWin && !preloadWin.isDestroyed()) {
              preloadWin.destroy()
            }
            preloadReady = false
            preloadUrl = data.url
            preloadWin = createHiddenPlaybackWindow()
            preloadWin.webContents.setAudioMuted(true)
            const preloadTarget = preloadWin
            preloadWin.webContents.on('dom-ready', () => {
              if (preloadTarget.isDestroyed()) return
              setupPlaybackScripts(preloadTarget.webContents)
              // Set volume to match current playback
              const pvol = lastKnownVolume
              preloadTarget.webContents.executeJavaScript(`
                (function() {
                  window.__tuneboxDesiredVolume = ${pvol};
                })()
              `).catch(() => {})
              // Wait for video to buffer, then pause it
              let attempts = 0
              const checkInterval = setInterval(async () => {
                attempts++
                if (preloadTarget.isDestroyed()) { clearInterval(checkInterval); return }
                try {
                  const ready = await preloadTarget.webContents.executeJavaScript(`
                    (function() {
                      var v = document.querySelector('video');
                      if (v && v.readyState >= 3) {
                        v.pause();
                        return true;
                      }
                      return false;
                    })()
                  `)
                  if (ready) {
                    clearInterval(checkInterval)
                    preloadReady = true
                  }
                } catch(e) { clearInterval(checkInterval) }
                if (attempts > 30) clearInterval(checkInterval) // 15s timeout
              }, 500)
            })
            preloadWin.loadURL(data.url)
          }
          break
        case 'refreshPage':
          // Navigate the webview (not the active playback source) to refresh recommendations
          if (webviewWebContents && !webviewWebContents.isDestroyed()) {
            webviewWebContents.setAudioMuted(true)
            await webviewWebContents.loadURL('https://music.youtube.com')
          } else if (ytWebContents && !ytWebContents.isDestroyed()) {
            await ytWebContents.loadURL('https://music.youtube.com')
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
  const appIconPath = resolveAppIconPath()
  if (process.platform === 'darwin' && app.dock && appIconPath) {
    app.dock.setIcon(appIconPath)
  }

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
