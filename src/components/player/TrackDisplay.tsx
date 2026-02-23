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
    <div className="space-y-4 min-h-[200px] flex flex-col">
      <div className="text-center space-y-1">
        <div className="text-xs font-mono text-muted-foreground tracking-widest">
          NOW PLAYING
        </div>
        <div className={`amber-glow rounded-lg px-6 transition-opacity ${isChangingTrack ? 'opacity-50' : 'opacity-100'}`} style={{ minHeight: '68px', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '12px', paddingBottom: '12px' }}>
          <div className="text-lg font-bold text-accent-foreground tracking-wide truncate">
            {isChangingTrack ? 'TUNING...' : trackInfo.title.toUpperCase()}
          </div>
          <div className="text-sm text-accent-foreground/80 tracking-wide truncate" style={{ minHeight: '20px' }}>
            {!isChangingTrack && trackInfo.artist ? trackInfo.artist.toUpperCase() : '\u00A0'}
          </div>
        </div>
      </div>

      <div className="bg-card/50 rounded-lg p-4 border-2 border-muted/30 flex-1" style={{ minHeight: '112px' }}>
        {lyrics.length > 0 && !isChangingTrack ? (
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
        ) : (
          <div className="h-24 flex items-center justify-center text-xs font-mono text-muted-foreground">
            {isChangingTrack ? 'LOADING...' : 'NO LYRICS AVAILABLE'}
          </div>
        )}
      </div>
    </div>
  )
}
