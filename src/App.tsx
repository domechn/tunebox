import { useRef, useEffect, useState } from 'react'
import { VintageRadio } from '@/components/player/VintageRadio'
import type { YouTubeEmbedElement } from '@/hooks/use-youtube-music'
import { Power } from '@phosphor-icons/react'

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showLogin, setShowLogin] = useState(true)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const [authCapturedAt, setAuthCapturedAt] = useState<string | null>(null)
  const playerRef = useRef<YouTubeEmbedElement | null>(null)
  const isElectron = typeof window !== 'undefined' && typeof (window as Window & { electron?: unknown }).electron !== 'undefined'

  const YOUTUBE_MUSIC_URL = 'https://music.youtube.com'

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!isElectron || !window.electron) {
      return
    }

    let mounted = true
    const checkAuth = async () => {
      const state = await window.electron?.getYouTubeMusicAuthState()
      if (!mounted || !state) return
      if (state.ready) {
        setAuthCapturedAt(state.capturedAt ?? null)
        setShowLogin(false)
      }
    }

    checkAuth()
    const unsubscribe = window.electron.onYouTubeMusicAuthUpdated((payload) => {
      if (!mounted) return
      if (payload?.ready) {
        setAuthCapturedAt(payload.capturedAt ?? null)
        setShowLogin(false)
        setIsCheckingAuth(false)
      }
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [isElectron])

  const handleExit = () => {
    if (isElectron && window.electron?.quit) {
      window.electron.quit()
    } else {
      window.close()
    }
  }

  const handleLogout = async () => {
    if (isElectron && window.electron?.logout) {
      await window.electron.logout()
      setShowLogin(true)
      setAuthCapturedAt(null)
    }
  }

  const handleLogin = async () => {
    if (!isElectron || !window.electron) return

    setIsCheckingAuth(true)
    await window.electron.openYouTubeMusicLogin()

    const startedAt = Date.now()
    const poll = setInterval(async () => {
      const state = await window.electron?.getYouTubeMusicAuthState()
      if (state?.ready) {
        clearInterval(poll)
        setAuthCapturedAt(state.capturedAt ?? null)
        setShowLogin(false)
        setIsCheckingAuth(false)
      }

      if (Date.now() - startedAt > 10 * 60 * 1000) {
        clearInterval(poll)
        setIsCheckingAuth(false)
      }
    }, 2000)
  }

  return (
    <div className="relative w-full h-screen overflow-hidden rounded-[32px] bg-transparent">
      {showLogin ? (
        <div className="player-shell">
          {/* Corner screws */}
          <div className="screw screw-tl" />
          <div className="screw screw-tr" />
          <div className="screw screw-bl" />
          <div className="screw screw-br" />

          {/* Top Bar */}
          <div className="top-bar">
            <div className="app-brand" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
              <span className="app-brand-text">YT Music</span>
            </div>
            <button className="physical-btn physical-btn-danger" onClick={handleExit} title="Quit">
              <Power size={14} weight="bold" />
            </button>
          </div>

          {/* Screen Area */}
          <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div className="login-card">
              <div className="login-icon">🎵</div>
              <h1 className="login-title">MUSIC PLAYER</h1>
              <p className="login-desc">
                Sign in to YouTube Music to start streaming.
              </p>
              <div className="login-status">
                {authCapturedAt
                  ? `Authenticated · ${new Date(authCapturedAt).toLocaleTimeString()}`
                  : 'Waiting for login...'}
              </div>
              <button
                onClick={handleLogin}
                disabled={isCheckingAuth}
                className="login-btn"
              >
                {isCheckingAuth ? 'WAITING FOR LOGIN...' : 'SIGN IN'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isElectron ? (
            <webview
              ref={playerRef}
              src={YOUTUBE_MUSIC_URL}
              className="fixed inset-0 w-0 h-0 opacity-0 pointer-events-none"
              partition="persist:youtube-music"
              allowpopups="true"
              webpreferences="contextIsolation=yes"
            />
          ) : (
            <iframe
              ref={playerRef}
              src={YOUTUBE_MUSIC_URL}
              className="fixed inset-0 w-0 h-0 opacity-0 pointer-events-none"
              title="YouTube Music"
              allow="autoplay; encrypted-media"
            />
          )}

          {!isOnline && (
            <div className="player-shell" style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
              {/* Corner screws */}
              <div className="screw screw-tl" />
              <div className="screw screw-tr" />
              <div className="screw screw-bl" />
              <div className="screw screw-br" />

              {/* Top Bar */}
              <div className="top-bar">
                <div className="app-brand" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                  <span className="app-brand-text">YT Music</span>
                </div>
                <button className="physical-btn physical-btn-danger" onClick={handleExit} title="Quit">
                  <Power size={14} weight="bold" />
                </button>
              </div>

              {/* Screen Area */}
              <div className="screen-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div className="login-card">
                  <div className="login-icon">📡</div>
                  <h2 className="login-title">NO CONNECTION</h2>
                  <p className="login-desc">Check your internet connection</p>
                </div>
              </div>
            </div>
          )}

          <VintageRadio playerRef={playerRef} onExit={handleExit} onLogout={handleLogout} />
        </>
      )}
      <div className="player-shell-shadow" />
    </div>
  )
}

export default App
