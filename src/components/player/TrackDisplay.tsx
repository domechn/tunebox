import { useState, useEffect, useMemo } from 'react'
import { MusicNote } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { MarqueeText } from '@/components/ui/marquee-text'

interface TrackInfo {
  title: string
  artist: string
  album?: string
  thumbnail?: string
}

interface TrackDisplayProps {
  trackInfo: TrackInfo
  lyrics: string[]
  currentLyricText?: string
  currentTime: number
  duration: number
  isChangingTrack: boolean
}

export function TrackDisplay({ trackInfo, lyrics, currentLyricText: currentLyricProp, currentTime, duration, isChangingTrack }: TrackDisplayProps) {
  const [imageError, setImageError] = useState(false)

  const currentLyricText = useMemo(() => {
    if (currentLyricProp) return currentLyricProp
    if (lyrics.length > 0 && duration > 0) {
      const progress = currentTime / duration
      const index = Math.min(Math.floor(progress * lyrics.length), lyrics.length - 1)
      return lyrics[index] || ''
    }
    return ''
  }, [currentLyricProp, lyrics, currentTime, duration])

  useEffect(() => {
    setImageError(false)
  }, [trackInfo.thumbnail])

  const hasAlbumArt = trackInfo.thumbnail && !imageError

  return (
    <div className="w-full min-h-[132px] flex flex-col">
      <div className="flex gap-2 mb-2">
        <AnimatePresence mode="wait">
          {hasAlbumArt && (
            <motion.div
              key={trackInfo.thumbnail}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex-shrink-0"
            >
              <div className="w-16 h-16 rounded-md overflow-hidden border-2 border-primary/40 shadow-xl bg-card/80">
                <img
                  src={trackInfo.thumbnail}
                  alt={`${trackInfo.title} album art`}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 space-y-1 min-w-0">
          <div className="text-[10px] font-mono text-muted-foreground tracking-widest">
            NOW PLAYING
          </div>
          <div className={`amber-glow rounded-md px-3 transition-opacity ${isChangingTrack ? 'opacity-50' : 'opacity-100'}`} style={{ minHeight: '46px', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '6px', paddingBottom: '6px' }}>
            <MarqueeText 
              text={isChangingTrack ? 'TUNING...' : trackInfo.title.toUpperCase()} 
              className="text-xs font-bold text-accent-foreground tracking-wide" 
            />
            <div style={{ minHeight: '14px' }}>
              <MarqueeText 
                text={!isChangingTrack && trackInfo.artist ? trackInfo.artist.toUpperCase() : '\u00A0'} 
                className="text-[11px] text-accent-foreground/80 tracking-wide" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/50 rounded-md p-2 border border-muted/30 flex-1 flex items-center justify-center" style={{ minHeight: '56px' }}>
        {currentLyricText && !isChangingTrack ? (
          <MarqueeText
            text={currentLyricText}
            className="text-[11px] font-mono text-accent font-bold"
            speed={0.15}
          />
        ) : (
          <div className="text-[10px] font-mono text-muted-foreground">
            {isChangingTrack ? 'LOADING...' : 'NO LYRICS AVAILABLE'}
          </div>
        )}
      </div>
    </div>
  )
}
