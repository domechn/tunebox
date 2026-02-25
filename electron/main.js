const { app, BrowserWindow, session, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { getScript } = require('./scripts')

let mainWindow
let loginWindow
let ytWebContents = null
let webviewWebContents = null   // Always the renderer's webview (for recommendations)
let activeExtraWin = null       // Hidden BrowserWindow currently playing (after preload swap)
let preloadWin = null           // Hidden BrowserWindow preloading next track
let preloadUrl = null           // URL being preloaded
let preloadReady = false        // Preload video is buffered and paused
let preloadSerial = 0           // Monotonic counter to invalidate stale preload callbacks
let preloadProbeTimer = null    // Single active preload readiness probe timer
let lastKnownVolume = 0.7      // Last setVolume value (0-1), for preload window setup
let playTrackSerial = 0         // Monotonic counter to cancel stale play-polls
let queueClearedOnStartup = false  // Ensures YT Music queue is cleared only once per launch

function getActivePlaybackWebContents() {
  if (activeExtraWin && !activeExtraWin.isDestroyed() && activeExtraWin.webContents && !activeExtraWin.webContents.isDestroyed()) {
    return activeExtraWin.webContents
  }
  if (ytWebContents && !ytWebContents.isDestroyed()) {
    return ytWebContents
  }
  return null
}

const YTMUSIC_URL = 'https://music.youtube.com'
const YTMUSIC_PARTITION = 'persist:youtube-music'
const AUTH_HEADER_FILE = 'ytmusic-auth.json'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const ENABLE_PLAYBACK_DIAGNOSTICS = process.env.NODE_ENV === 'development'

function diagLog(event, payload = {}) {
  if (!ENABLE_PLAYBACK_DIAGNOSTICS) return
  const ts = new Date().toISOString()
  try {
    console.log(`[TuneBoxDiag][${ts}] ${event}`, payload)
  } catch (_) {}
}

// Disable Chromium autoplay restrictions globally.
// Without this, video.play() called from executeJavaScript (which is NOT
// a user gesture) can be silently rejected by Chrome's autoplay policy,
// causing songs to stay paused after switching tracks.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

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
      webSecurity: true,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })
  win.webContents.setUserAgent(USER_AGENT)
  return win
}

function silenceWebContents(wc) {
  if (!wc || wc.isDestroyed()) return
  try {
    wc.setAudioMuted(true)
    wc.executeJavaScript(getScript('silence-video')).catch(() => {})
  } catch (_) {}
}

function enforceSingleActivePlayback(activeWc) {
  diagLog('enforceSingleActivePlayback', {
    activeId: activeWc && !activeWc.isDestroyed() ? activeWc.id : null,
    ytId: ytWebContents && !ytWebContents.isDestroyed() ? ytWebContents.id : null,
    webviewId: webviewWebContents && !webviewWebContents.isDestroyed() ? webviewWebContents.id : null,
    activeExtraId: activeExtraWin && !activeExtraWin.isDestroyed() && activeExtraWin.webContents && !activeExtraWin.webContents.isDestroyed()
      ? activeExtraWin.webContents.id
      : null,
    preloadId: preloadWin && !preloadWin.isDestroyed() && preloadWin.webContents && !preloadWin.webContents.isDestroyed()
      ? preloadWin.webContents.id
      : null
  })
  const candidates = [
    ytWebContents,
    webviewWebContents,
    activeExtraWin && !activeExtraWin.isDestroyed() ? activeExtraWin.webContents : null,
    preloadWin && !preloadWin.isDestroyed() ? preloadWin.webContents : null
  ]

  const seen = new Set()
  for (const wc of candidates) {
    if (!wc || wc.isDestroyed()) continue
    if (seen.has(wc.id)) continue
    seen.add(wc.id)

    if (activeWc && wc.id === activeWc.id) {
      try { wc.setAudioMuted(false) } catch (_) {}
      continue
    }

    silenceWebContents(wc)
  }
}

function pauseAllKnownPlaybackSources() {
  diagLog('pauseAllKnownPlaybackSources:start')
  const candidates = [
    ytWebContents,
    webviewWebContents,
    activeExtraWin && !activeExtraWin.isDestroyed() ? activeExtraWin.webContents : null,
    preloadWin && !preloadWin.isDestroyed() ? preloadWin.webContents : null
  ]

  const seen = new Set()
  for (const wc of candidates) {
    if (!wc || wc.isDestroyed()) continue
    if (seen.has(wc.id)) continue
    seen.add(wc.id)

    try {
      diagLog('pauseAllKnownPlaybackSources:pausingWc', { wcId: wc.id })
      wc.setAudioMuted(true)
      wc.executeJavaScript(getScript('pause-all-sources')).catch(() => {})
    } catch (_) {}
  }
  diagLog('pauseAllKnownPlaybackSources:done')
}

// Inject control scripts + volume interception + video event listeners into a webContents.
// Called on the renderer's webview (dom-ready) and on preload windows.
// initialVolume: 0-1 float, used to pre-seed __tuneboxDesiredVolume so volume enforcement
// kicks in immediately (before the first explicit setVolume command arrives).
function setupPlaybackScripts(wc, initialVolume) {
  const controlScript = fs.readFileSync(path.join(__dirname, 'ytmusic-control.js'), 'utf8')
  wc.executeJavaScript(controlScript)

  const seedVolume = (typeof initialVolume === 'number') ? initialVolume : null
  wc.executeJavaScript(getScript('setup-playback', { SEED_VOLUME: seedVolume }))
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
      autoplayPolicy: 'no-user-gesture-required',
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
    diagLog('didAttachWebview', { wcId: webContents.id })
    webviewWebContents = webContents
    if (!activeExtraWin || activeExtraWin.isDestroyed()) {
      ytWebContents = webContents
    }
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

      setupPlaybackScripts(webContents, lastKnownVolume)

      // On the very first load of this session, clear any queue left from a previous session.
      if (!queueClearedOnStartup) {
        queueClearedOnStartup = true
        webContents.executeJavaScript(getScript('clear-queue')).catch(function () {})
      }

      // Fast path: detect videoEnded via console-message (near-instant, no polling delay)
      webContents.on('console-message', async (_event, _level, message) => {
        if (message === '__TUNEBOX_VIDEO_ENDED__' && mainWindow && !mainWindow.isDestroyed()) {
          diagLog('videoEnded:consoleSignal', { wcId: webContents.id })

          // Proactively pause + mute before YT Music's own autoplay queue can bleed through.
          // Keep retrying a few times in case pause() gets ignored by the player.
          try {
            await webContents.executeJavaScript(getScript('video-ended-retry'))
          } catch (_) {}

          mainWindow.webContents.send('ytmusic-state', { videoEnded: true })
        }
      })

      // Poll player state via executeJavaScript and forward to renderer over IPC.
      // window.parent.postMessage does NOT cross Electron's OOPIF process boundary,
      // so this is the only reliable way to get data back from the webview.
      let recsPollCounter = 0

      const pollTimer = setInterval(async () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          clearInterval(pollTimer)
          return
        }
        const activePlaybackWc = getActivePlaybackWebContents()
        if (!activePlaybackWc || activePlaybackWc.isDestroyed()) return
        try {
          const state = await activePlaybackWc.executeJavaScript(getScript('poll-state'))
          // Periodically merge homepage recommendations from the webview when
          // playback source has been swapped to a hidden preload window
          if (state && webviewWebContents && webviewWebContents !== activePlaybackWc && !webviewWebContents.isDestroyed()) {
            recsPollCounter++
            if (recsPollCounter % 3 === 0) {
              try {
                const recsState = await webviewWebContents.executeJavaScript(getScript('poll-recs'))
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
    const activePlaybackWc = getActivePlaybackWebContents()
    if (!activePlaybackWc || activePlaybackWc.isDestroyed()) return { ok: false }
    try {
      switch (command) {
        case 'play':
          diagLog('command:play', { wcId: activePlaybackWc.id })
          enforceSingleActivePlayback(activePlaybackWc)
          await activePlaybackWc.executeJavaScript(getScript('cmd-play'))
          break
        case 'pause':
          diagLog('command:pause', { wcId: activePlaybackWc.id })
          pauseAllKnownPlaybackSources()
          break

        case 'pauseBeforeTrackEnd': {
          // Proactively called ~1-1.5s before a track ends.
          // Mute + pause all sources and set __tuneboxAwaitingOurNavigation=true so that
          // when the video 'ended' event fires and YT Music tries to auto-advance its own
          // queue, every 'play' event will be silently suppressed until we navigate.
          diagLog('command:pauseBeforeTrackEnd')
          const preEndCandidates = [
            ytWebContents,
            webviewWebContents,
            activeExtraWin && !activeExtraWin.isDestroyed() ? activeExtraWin.webContents : null,
            preloadWin && !preloadWin.isDestroyed() ? preloadWin.webContents : null
          ]
          const preEndSeen = new Set()
          for (const wc of preEndCandidates) {
            if (!wc || wc.isDestroyed()) continue
            if (preEndSeen.has(wc.id)) continue
            preEndSeen.add(wc.id)
            try {
              wc.setAudioMuted(true)
              wc.executeJavaScript(getScript('cmd-pause-before-track-end')).catch(() => {})
            } catch(_) {}
          }
          break
        }
        case 'next':
          diagLog('command:next', { wcId: activePlaybackWc.id })
          await activePlaybackWc.executeJavaScript(getScript('cmd-next'))
          break
        case 'previous':
          diagLog('command:previous', { wcId: activePlaybackWc.id })
          await activePlaybackWc.executeJavaScript(getScript('cmd-previous'))
          break
        case 'dislike':
          diagLog('command:dislike', { wcId: activePlaybackWc.id })
          await activePlaybackWc.executeJavaScript(getScript('cmd-dislike'))
          break
        case 'seek':
          if (data && typeof data.time === 'number') {
            diagLog('command:seek', { wcId: activePlaybackWc.id, time: data.time })
            await activePlaybackWc.executeJavaScript(getScript('cmd-seek', { SEEK_TIME: data.time }))
          }
          break
        case 'setVolume':
          if (data && typeof data.volume === 'number') {
            diagLog('command:setVolume', { wcId: activePlaybackWc.id, volume: data.volume })
            const vol01 = data.volume / 100
            lastKnownVolume = vol01
            await activePlaybackWc.executeJavaScript(getScript('cmd-set-volume', { VOLUME: vol01 }))
          }
          break
        case 'playTrack':
          if (data && data.url) {
            diagLog('command:playTrack:start', {
              requestedUrl: data.url,
              wcId: activePlaybackWc.id,
              preloadReady,
              preloadUrl,
              hasPreloadWin: !!(preloadWin && !preloadWin.isDestroyed())
            })
            // Check if this URL was preloaded and is ready
            if (preloadReady && preloadUrl === data.url && preloadWin && !preloadWin.isDestroyed()) {
              diagLog('command:playTrack:preloadHit', { requestedUrl: data.url, newSerial: playTrackSerial })
              // ── Swap to preloaded window (instant playback) ──
              // 1. Mute and pause old active source + invalidate its play-poll
              if (ytWebContents && !ytWebContents.isDestroyed()) {
                ytWebContents.setAudioMuted(true)
                ytWebContents.executeJavaScript(getScript('cmd-silence-old-source')).catch(() => {})
              }
              // 2. Destroy previous hidden playback window if any
              if (activeExtraWin && !activeExtraWin.isDestroyed()) {
                activeExtraWin.destroy()
              }
              // 3. Promote preloaded window to active
              activeExtraWin = preloadWin
              const promotedWin = activeExtraWin
              const promotedWcId = promotedWin.webContents && !promotedWin.webContents.isDestroyed()
                ? promotedWin.webContents.id
                : null
              diagLog('command:playTrack:promotePreload', { promotedWcId, requestedUrl: data.url })
              promotedWin.on('closed', () => {
                if (activeExtraWin !== promotedWin) return
                diagLog('activeExtraWin:closed', { wcId: promotedWcId })
                activeExtraWin = null
                if (webviewWebContents && !webviewWebContents.isDestroyed()) {
                  ytWebContents = webviewWebContents
                }
              })
              ytWebContents = preloadWin.webContents
              // Invalidate any stale preload probes tied to the promoted window
              preloadSerial++
              if (preloadProbeTimer) {
                clearInterval(preloadProbeTimer)
                preloadProbeTimer = null
              }
              preloadWin = null
              preloadUrl = null
              preloadReady = false
              enforceSingleActivePlayback(ytWebContents)
              // 4. Unmute and resume playback with correct volume
              ytWebContents.setAudioMuted(false)
              const swapVol = lastKnownVolume
              // Listen for videoEnded on the promoted window
              ytWebContents.on('console-message', (_event, _level, message) => {
                if (message === '__TUNEBOX_VIDEO_ENDED__' && mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('ytmusic-state', { videoEnded: true })
                }
              })
              await ytWebContents.executeJavaScript(getScript('cmd-swap-preload-resume', { VOLUME: swapVol }))
              // 5. Navigate the old webview back to homepage for recommendations
              if (webviewWebContents && webviewWebContents !== ytWebContents && !webviewWebContents.isDestroyed()) {
                webviewWebContents.setAudioMuted(true)
                webviewWebContents.loadURL('https://music.youtube.com').catch(() => {})
              }
            } else {
              diagLog('command:playTrack:preloadMiss', { requestedUrl: data.url, newSerial: playTrackSerial })
              // ── Normal navigation (preload miss) ──
              // Cancel any in-progress preload unconditionally — we're about to
              // navigate activePlaybackWc directly, so a stale preload for any URL
              // (including the same URL) must not be promoted afterwards.
              if (preloadWin && !preloadWin.isDestroyed()) {
                preloadSerial++
                if (preloadProbeTimer) {
                  clearInterval(preloadProbeTimer)
                  preloadProbeTimer = null
                }
                preloadWin.destroy()
                preloadWin = null
                preloadUrl = null
                preloadReady = false
              }
              // Bump serial so any in-flight play-poll from a previous
              // playTrack call will self-cancel.
              playTrackSerial++
              const mySerial = playTrackSerial
              enforceSingleActivePlayback(activePlaybackWc)
              // Navigate to the new track. With autoplay-policy=no-user-gesture-required,
              // video.play() is guaranteed to work, so we use a simple approach:
              // mute+pause old → SPA navigate → poll until video loads → play() → unmute.
              await activePlaybackWc.executeJavaScript(getScript('cmd-play-track-spa', { URL: data.url, SERIAL: mySerial }))
            }
          }
          break
        case 'preloadTrack':
          if (data && data.url) {
            if (preloadWin && !preloadWin.isDestroyed() && preloadUrl === data.url) {
              diagLog('command:preloadTrack:skipExisting', {
                url: data.url,
                preloadReady
              })
              break
            }

            diagLog('command:preloadTrack:start', { url: data.url })
            preloadSerial++
            const myPreloadSerial = preloadSerial
            const targetUrl = data.url
            if (preloadProbeTimer) {
              clearInterval(preloadProbeTimer)
              preloadProbeTimer = null
            }
            // Destroy existing preload window if any
            if (preloadWin && !preloadWin.isDestroyed()) {
              preloadWin.destroy()
            }
            preloadReady = false
            preloadUrl = targetUrl
            preloadWin = createHiddenPlaybackWindow()
            preloadWin.webContents.setAudioMuted(true)
            const preloadTarget = preloadWin
            preloadWin.webContents.once('dom-ready', () => {
              if (myPreloadSerial !== preloadSerial) return
              if (preloadTarget.isDestroyed()) return
              setupPlaybackScripts(preloadTarget.webContents, lastKnownVolume)
              // Set volume to match current playback
              const pvol = lastKnownVolume
              preloadTarget.webContents.executeJavaScript(getScript('preload-seed-volume', { VOLUME: pvol })).catch(() => {})
              // Wait for video to buffer, then pause it
              let attempts = 0
              let probeInFlight = false
              let probeResolved = false
              const checkInterval = setInterval(async () => {
                if (myPreloadSerial !== preloadSerial) {
                  clearInterval(checkInterval)
                  if (preloadProbeTimer === checkInterval) preloadProbeTimer = null
                  return
                }
                if (probeResolved) {
                  clearInterval(checkInterval)
                  if (preloadProbeTimer === checkInterval) preloadProbeTimer = null
                  return
                }
                if (probeInFlight) return

                attempts++
                if (preloadTarget.isDestroyed()) {
                  clearInterval(checkInterval)
                  if (preloadProbeTimer === checkInterval) preloadProbeTimer = null
                  return
                }
                probeInFlight = true
                try {
                  const ready = await preloadTarget.webContents.executeJavaScript(getScript('preload-probe'))
                  if (ready) {
                    clearInterval(checkInterval)
                    if (preloadProbeTimer === checkInterval) preloadProbeTimer = null
                    if (myPreloadSerial !== preloadSerial) return
                    if (!preloadWin || preloadWin !== preloadTarget || preloadTarget.isDestroyed()) return
                    if (preloadUrl !== targetUrl) return
                    probeResolved = true
                    preloadReady = true
                    diagLog('command:preloadTrack:ready', { url: targetUrl, attempts })
                  }
                } catch(e) {
                  clearInterval(checkInterval)
                  if (preloadProbeTimer === checkInterval) preloadProbeTimer = null
                }
                finally { probeInFlight = false }
                if (attempts > 30) {
                  clearInterval(checkInterval) // 15s timeout
                  if (preloadProbeTimer === checkInterval) preloadProbeTimer = null
                }
              }, 500)
              preloadProbeTimer = checkInterval
              preloadTarget.webContents.once('destroyed', () => {
                clearInterval(checkInterval)
                if (preloadProbeTimer === checkInterval) preloadProbeTimer = null
              })
            })
            preloadWin.loadURL(data.url)
          }
          break
        case 'refreshPage':
          diagLog('command:refreshPage')
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

app.on('before-quit', () => {
  // Silence all audio immediately so nothing is heard after Cmd+Q / quit.
  const silenceWC = (wc) => {
    if (!wc || wc.isDestroyed()) return
    try {
      wc.setAudioMuted(true)
      wc.executeJavaScript(getScript('silence-video')).catch(() => {})
    } catch(_) {}
  }
  silenceWC(ytWebContents)
  silenceWC(webviewWebContents)
  if (activeExtraWin && !activeExtraWin.isDestroyed()) silenceWC(activeExtraWin.webContents)
  if (preloadWin && !preloadWin.isDestroyed()) silenceWC(preloadWin.webContents)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
