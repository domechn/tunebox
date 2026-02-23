import { useRef, useEffect, useState } from 'react'
import { VintageRadio } from '@/components/player/VintageRadio'
import { toast, Toaster } from 'sonner'

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
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

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Toaster position="top-center" />
      
      <iframe
        ref={iframeRef}
        src={YOUTUBE_MUSIC_URL}
        className="fixed inset-0 w-0 h-0 opacity-0 pointer-events-none"
        title="YouTube Music"
        allow="autoplay; encrypted-media"
        sandbox="allow-same-origin allow-scripts allow-forms"
      />

      {!isOnline && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50">
          <div className="text-center space-y-4 p-8">
            <div className="text-6xl animate-pulse">📻</div>
            <h2 className="text-2xl font-bold text-foreground">NO SIGNAL</h2>
            <p className="text-muted-foreground font-mono text-sm">Check antenna connection</p>
          </div>
        </div>
      )}

      <VintageRadio iframeRef={iframeRef} onExit={handleExit} />
    </div>
  )
}

export default App
