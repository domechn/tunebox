import { useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { PlayerControls } from '@/components/player/PlayerControls'
import { SearchBar } from '@/components/search/SearchBar'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import { MiniPlayer } from '@/components/player/MiniPlayer'
import { Gear, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

function App() {
  const [isMiniMode, setIsMiniMode] = useKV<boolean>('mini-mode', false)
  const [showControls, setShowControls] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const YOUTUBE_MUSIC_URL = 'https://music.youtube.com'

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Connection restored')
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.error('No internet connection')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleMouseMove = () => {
    if (!isMiniMode) {
      setShowControls(true)
      
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }

      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const handleSearch = (query: string) => {
    if (iframeRef.current && query.trim()) {
      const searchUrl = `${YOUTUBE_MUSIC_URL}/search?q=${encodeURIComponent(query)}`
      iframeRef.current.src = searchUrl
      setShowSearch(false)
      toast.success(`Searching for "${query}"`)
    }
  }

  if (isMiniMode) {
    return <MiniPlayer onExitMiniMode={() => setIsMiniMode(false)} />
  }

  return (
    <TooltipProvider>
      <div 
        className="relative w-full h-screen overflow-hidden bg-background"
        onMouseMove={handleMouseMove}
      >
        <iframe
          ref={iframeRef}
          src={YOUTUBE_MUSIC_URL}
          className="w-full h-full border-0"
          title="YouTube Music"
          allow="autoplay; encrypted-media; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />

        {!isOnline && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <div className="text-6xl">🔌</div>
              <h2 className="text-2xl font-bold">No Internet Connection</h2>
              <p className="text-muted-foreground">Please check your network and try again</p>
            </div>
          </div>
        )}

        <div
          className={`absolute top-0 left-0 right-0 p-6 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="glassmorphic rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight">YouTube Music</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearch(true)}
                    className="hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    <MagnifyingGlass size={20} weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search (Ctrl+F)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(true)}
                    className="hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    <Gear size={20} weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings (Ctrl+,)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div
          className={`absolute bottom-0 left-0 right-0 p-6 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <PlayerControls onMiniModeToggle={() => setIsMiniMode(true)} />
        </div>

        <SearchBar
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onSearch={handleSearch}
        />

        <SettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </TooltipProvider>
  )
}

export default App
