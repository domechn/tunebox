import { useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TrackInfo {
  title: string
  artist: string
  album?: string
}

interface TrackDisplayProps {
  trackInfo: TrackInfo
  lyrics: string[]
  currentTime: number
  duration: number
  isChangingTrack: boolean
}

export function TrackDisplay({ trackInfo, lyrics, currentTime, duration, isChangingTrack }: TrackDisplayProps) {
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0)

  useEffect(() => {
    if (lyrics.length > 0 && duration > 0) {
      const progress = currentTime / duration
      const newIndex = Math.floor(progress * lyrics.length)
      setCurrentLyricIndex(Math.min(newIndex, lyrics.length - 1))
    }
  }, [currentTime, duration, lyrics.length])

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <div className="text-xs font-mono text-muted-foreground tracking-widest">
          NOW PLAYING
        </div>
        <div className={`amber-glow rounded-lg px-6 py-3 transition-opacity ${isChangingTrack ? 'opacity-50' : 'opacity-100'}`}>
          <div className="text-lg font-bold text-accent-foreground tracking-wide truncate">
            {isChangingTrack ? 'TUNING...' : trackInfo.title.toUpperCase()}
          </div>
          {!isChangingTrack && trackInfo.artist && (
            <div className="text-sm text-accent-foreground/80 tracking-wide truncate">
              {trackInfo.artist.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {lyrics.length > 0 && !isChangingTrack && (
        <div className="bg-card/50 rounded-lg p-4 border-2 border-muted/30">
          <ScrollArea className="h-24">
            <div className="space-y-2">
              {lyrics.map((line, index) => (
                <div
                  key={index}
                  className={`text-sm font-mono transition-all duration-300 ${
                    index === currentLyricIndex
                      ? 'text-accent font-bold scale-105'
                      : index < currentLyricIndex
                      ? 'text-muted-foreground/50'
                      : 'text-foreground/70'
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
