import { useState, useRef, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { SkipBack, SkipForward, Play, Pause, ThumbsDown, Power, SignOut } from '@phosphor-icons/react'
import type { UseYouTubeMusicReturn } from '@/hooks/use-youtube-music'
import { MarqueeText } from '@/components/ui/marquee-text'

interface VintageRadioProps {
  ytMusic: UseYouTubeMusicReturn
  onExit: () => void
  onLogout: () => void
  showDebugButton?: boolean
  onOpenDebug?: () => void
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VintageRadio({ ytMusic, onExit, onLogout, showDebugButton = false, onOpenDebug }: VintageRadioProps) {
  const [volume, setVolume] = useLocalStorage<number>('radio-vol', 70)
  const [isChangingTrack, setIsChangingTrack] = useState(false)
  const [previewTime, setPreviewTime] = useState<number | null>(null)
  const [knobRotation, setKnobRotation] = useState(() => (volume / 100) * 270 - 135)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const lastAngleRef = useRef(0)
  const knobRotationRef = useRef((volume / 100) * 270 - 135)
  const progressTrackRef = useRef<HTMLDivElement>(null)
  const draggedVolumeRef = useRef(volume)

  const { setVolume: ytSetVolume, trackInfo, playbackState, playNextFromPlaylist, playPreviousFromPlaylist, playedHistory, isLoadingMore } = ytMusic
  const isFirstTrack = playedHistory.length === 0
  const [imageError, setImageError] = useState(false)

  useEffect(() => { setImageError(false) }, [trackInfo.thumbnail])

  // Clear isChangingTrack when track info actually changes (event-driven loading)
  const prevTrackTitleForLoading = useRef(trackInfo.title)
  useEffect(() => {
    if (isChangingTrack && trackInfo.title !== prevTrackTitleForLoading.current) {
      setIsChangingTrack(false)
    }
    prevTrackTitleForLoading.current = trackInfo.title
  }, [trackInfo.title, isChangingTrack])

  // Safety timeout: clear loading state after 8s even if track title never changes
  useEffect(() => {
    if (!isChangingTrack) return
    const timer = setTimeout(() => setIsChangingTrack(false), 8000)
    return () => clearTimeout(timer)
  }, [isChangingTrack])

  // Sync volume to YouTube Music
  useEffect(() => {
    if (!isDraggingRef.current) ytSetVolume(volume)
  }, [volume, ytSetVolume])

  const handlePrevious = () => {
    setIsChangingTrack(true)
    playPreviousFromPlaylist()
  }

  const handleNext = () => {
    setIsChangingTrack(true)
    playNextFromPlaylist()
  }

  const handleDislike = () => {
    setIsChangingTrack(true)
    ytMusic.handleDislikeAndNext()
  }

  // Progress bar seek via click/drag
  const seekFromEvent = (clientX: number) => {
    const track = progressTrackRef.current
    if (!track || playbackState.duration <= 0) return null
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * playbackState.duration
  }

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setPreviewTime(seekFromEvent(e.clientX))
    const handleMouseMove = (ev: MouseEvent) => {
      setPreviewTime(seekFromEvent(ev.clientX))
    }
    const handleMouseUp = (ev: MouseEvent) => {
      const time = seekFromEvent(ev.clientX)
      if (time !== null) ytMusic.seek(time)
      setPreviewTime(null)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleRingMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks on the inner button area
    const target = e.target as HTMLElement
    if (target.closest('.wheel-inner-buttons')) return

    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    lastAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX)

    const handleMouseMove = (ev: MouseEvent) => {
      const ringElement = document.getElementById('volume-ring')
      if (!ringElement) return
      const r = ringElement.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx)
      const rawDelta = angle - lastAngleRef.current
      const delta = ((rawDelta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
      lastAngleRef.current = angle
      const newRotation = Math.max(-135, Math.min(135, knobRotationRef.current + (delta * 180 / Math.PI)))
      const newVolume = Math.round(((newRotation + 135) / 270) * 100)
      knobRotationRef.current = newRotation
      setKnobRotation(newRotation)
      draggedVolumeRef.current = newVolume
      setVolume(newVolume)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
      ytSetVolume(draggedVolumeRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    isDraggingRef.current = true
    draggedVolumeRef.current = volume
    setIsDragging(true)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const hasAlbumArt = !!trackInfo.thumbnail && !imageError
  const progress = playbackState.duration > 0
    ? ((previewTime ?? playbackState.currentTime) / playbackState.duration) * 100
    : 0

  return (
    <div
      className="player-shell"
    >
      {/* Top Bar with physical buttons and drag handle */}
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="physical-btn" onClick={onLogout} title="Sign out">
            <SignOut size={14} weight="bold" />
          </button>
          {showDebugButton && onOpenDebug ? (
            <button className="physical-btn" onClick={onOpenDebug} title="Debug">
              D
            </button>
          ) : null}
        </div>
        <div className="app-brand">
          <span className="app-brand-text">TuneBox</span>
        </div>
        <button className="physical-btn physical-btn-danger" onClick={onExit} title="Quit">
          <Power size={14} weight="bold" />
        </button>
      </div>

      {/* Screen Area */}
      <div className="screen-container">
        {/* Album Art */}
        <div className="album-art-wrap">
          {hasAlbumArt ? (
            <img
              key={trackInfo.thumbnail}
              src={trackInfo.thumbnail}
              alt="album art"
              className={`album-art-img ${isChangingTrack ? 'changing' : ''}`}
              draggable={false}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`album-art-empty ${isChangingTrack ? 'changing' : ''}`}>
              <span>♪</span>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className={`track-info ${isChangingTrack ? 'changing' : ''}`}>
          <MarqueeText 
            text={isChangingTrack ? 'Loading...' : (trackInfo.title || 'YouTube Music')} 
            className="track-title" 
          />
          {isLoadingMore && !isChangingTrack ? (
            <div className="loading-more-indicator">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
              <span className="loading-more-text">Loading more songs</span>
            </div>
          ) : (
            <MarqueeText 
              text={!isChangingTrack && trackInfo.artist ? trackInfo.artist : '\u00A0'} 
              className="track-artist" 
            />
          )}
        </div>

        {/* Progress Bar - clickable/draggable */}
        <div className="progress-section">
          <div
            className="progress-track"
            ref={progressTrackRef}
            onMouseDown={handleProgressMouseDown}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <div className="progress-thumb" style={{ left: `${progress}%` }} />
          </div>
          <div className="progress-times">
            <span>{formatTime(previewTime ?? playbackState.currentTime)}</span>
            <span>{formatTime(playbackState.duration)}</span>
          </div>
        </div>
      </div>

      {/* Wheel: Outer Volume Ring + Inner Buttons */}
      <div className="wheel-container">
        <div
          id="volume-ring"
          className={`wheel-ring ${isDragging ? 'wheel-ring-grabbing' : ''}`}
          onMouseDown={handleRingMouseDown}
        >
          {/* Tick marks on outer ring */}
          <div className="ring-indicator" style={{
            transform: `rotate(${knobRotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }} />
          <div className="ring-ticks" />
        </div>

        {/* Inner circle with buttons */}
        <div className="wheel-inner-buttons">
          <button className="wheel-btn wheel-top" onClick={handleDislike} disabled={isChangingTrack}>
            <ThumbsDown size={16} weight="fill" />
          </button>
          <button className="wheel-btn wheel-left" onClick={handlePrevious} disabled={isChangingTrack || isFirstTrack}>
            <SkipBack size={18} weight="fill" />
          </button>
          <button className="wheel-btn wheel-right" onClick={handleNext} disabled={isChangingTrack}>
            <SkipForward size={18} weight="fill" />
          </button>
          <button className="wheel-btn wheel-bottom" onClick={ytMusic.togglePlayPause}>
            {playbackState.isPlaying
              ? <Pause size={18} weight="fill" />
              : <Play size={18} weight="fill" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
