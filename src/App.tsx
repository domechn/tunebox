import { useRef, useEffect, useState } from 'react'
import { VintageRadio } from '@/components/player/VintageRadio'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showLogin, setShowLogin] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const YOUTUBE_MUSIC_URL = 'https://music.youtube.com'

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Radio signal restored')
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.error('Radio signal lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleExit = () => {
    window.close()
  }

  const handleContinue = () => {
    setShowLogin(false)
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Toaster position="top-center" />
      
      {showLogin ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
          <div className="wood-grain rounded-3xl p-12 shadow-2xl border-8 border-card max-w-md w-full mx-4" style={{ animation: 'scale-in 0.6s ease-out' }}>
            <div className="space-y-6 text-center">
              <div className="text-6xl mb-4" style={{ animation: 'rotate-in 0.8s ease-out' }}>📻</div>
              <h1 className="text-2xl font-bold text-foreground" style={{ animation: 'slide-down 0.5s ease-out 0.2s backwards' }}>VINTAGE RADIO</h1>
              <p className="text-sm text-muted-foreground font-mono" style={{ animation: 'fade-in 0.5s ease-out 0.3s backwards' }}>
                Sign in to YouTube Music below, then return here to start streaming
              </p>
              <div className="bg-card/50 rounded-lg p-4 border-2 border-muted/30" style={{ animation: 'slide-up 0.5s ease-out 0.4s backwards' }}>
                <iframe
                  ref={iframeRef}
                  src={YOUTUBE_MUSIC_URL}
                  className="w-full h-96 rounded"
                  title="YouTube Music Login"
                  allow="autoplay; encrypted-media"
                />
              </div>
              <Button
                onClick={handleContinue}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-bold transition-all hover:scale-105 active:scale-95"
                style={{ animation: 'slide-up 0.5s ease-out 0.5s backwards' }}
              >
                CONTINUE TO RADIO
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <iframe
            ref={iframeRef}
            src={YOUTUBE_MUSIC_URL}
            className="fixed inset-0 w-0 h-0 opacity-0 pointer-events-none"
            title="YouTube Music"
            allow="autoplay; encrypted-media"
          />

          {!isOnline && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50" style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div className="text-center space-y-4 p-8">
                <div className="text-6xl" style={{ animation: 'float 3s ease-in-out infinite' }}>📻</div>
                <h2 className="text-2xl font-bold text-foreground" style={{ animation: 'slide-down 0.5s ease-out 0.1s backwards' }}>NO SIGNAL</h2>
                <p className="text-muted-foreground font-mono text-sm" style={{ animation: 'fade-in 0.5s ease-out 0.2s backwards' }}>Check antenna connection</p>
              </div>
            </div>
          )}

          <VintageRadio iframeRef={iframeRef} onExit={handleExit} />
        </>
      )}
    </div>
  )
}

export default App
