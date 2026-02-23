import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { CaretLeft, CaretRight, Power } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { TrackDisplay } from './TrackDisplay'

interface VintageRadioProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  onExit: () => void
}

export function VintageRadio({ iframeRef, onExit }: VintageRadioProps) {
  const [volume, setVolume] = useKV<number[]>('radio-volume', [70])
  const [isChangingTrack, setIsChangingTrack] = useState(false)
  const [knobRotation, setKnobRotation] = useState(0)
  const isDraggingRef = useRef(false)
  const lastAngleRef = useRef(0)

  useEffect(() => {
    if (volume && volume[0] !== undefined) {
      const volumeValue = volume[0]
      setKnobRotation((volumeValue / 100) * 270 - 135)
    }
  }, [volume])

  const handlePrevious = () => {
    setIsChangingTrack(true)
    toast('Tuning to previous station...', { icon: '📻' })
    
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'youtube-music-command',
          command: 'previous'
        }, '*')
      } catch (e) {
        console.error('Failed to send previous command:', e)
      }
    }
    
    setTimeout(() => setIsChangingTrack(false), 1000)
  }

  const handleNext = () => {
    setIsChangingTrack(true)
    toast('Changing station...', { icon: '📻' })
    
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'youtube-music-command',
          command: 'dislike'
        }, '*')
        
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'youtube-music-command',
            command: 'next'
          }, '*')
        }, 100)
      } catch (e) {
        console.error('Failed to send next command:', e)
      }
    }
    
    setTimeout(() => setIsChangingTrack(false), 1000)
  }

  const handlePowerOff = () => {
    toast.error('Powering off radio...', { icon: '⚡' })
    setTimeout(() => onExit(), 800)
  }

  const handleKnobMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingRef.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    lastAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      
      const knobElement = document.getElementById('volume-knob')
      if (!knobElement) return
      
      const rect = knobElement.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
      const delta = angle - lastAngleRef.current
      lastAngleRef.current = angle
      
      const newRotation = Math.max(-135, Math.min(135, knobRotation + (delta * 180 / Math.PI)))
      const newVolume = Math.round(((newRotation + 135) / 270) * 100)
      
      setKnobRotation(newRotation)
      setVolume([newVolume])
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    if (isDraggingRef.current) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [knobRotation, setVolume])

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full bg-gradient-to-br from-background via-background to-muted p-8">
      <div className="relative w-full max-w-2xl">
        <div className="wood-grain rounded-3xl p-12 shadow-2xl border-8 border-card">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs font-mono">
                FM • 107.9 MHz
              </Badge>
              <Button
                size="sm"
                variant="destructive"
                onClick={handlePowerOff}
                className="rounded-full h-8 w-8 p-0 bg-destructive/80 hover:bg-destructive"
              >
                <Power size={16} weight="bold" />
              </Button>
            </div>

            <div className="speaker-grill rounded-2xl p-6 flex items-center justify-center border-4 border-muted/50">
              <TrackDisplay isChangingTrack={isChangingTrack} />
            </div>

            <div className="grid grid-cols-3 gap-8 items-center">
              <div className="flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  onClick={handlePrevious}
                  disabled={isChangingTrack}
                  className="h-20 w-20 rounded-full bg-card hover:bg-card/80 active:scale-95 transition-all shadow-lg border-4 border-primary/30"
                  style={{ animation: 'none' }}
                >
                  <CaretLeft size={32} weight="bold" className="text-primary" />
                </Button>
                <Badge variant="outline" className="text-[10px] font-mono">
                  PREV
                </Badge>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div
                    id="volume-knob"
                    className="brass-knob h-32 w-32 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center transition-shadow hover:shadow-xl"
                    onMouseDown={handleKnobMouseDown}
                    style={{
                      transform: `rotate(${knobRotation}deg)`,
                      transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out'
                    }}
                  >
                    <div className="absolute top-3 h-1 w-8 bg-accent-foreground rounded-full"></div>
                    <div className="absolute inset-8 rounded-full bg-muted/50 border-2 border-primary/40 flex items-center justify-center">
                      <div className="text-sm font-bold text-primary-foreground">
                        {volume ? volume[0] : 70}
                      </div>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  VOLUME
                </Badge>
              </div>

              <div className="flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={isChangingTrack}
                  className="h-20 w-20 rounded-full bg-card hover:bg-card/80 active:scale-95 transition-all shadow-lg border-4 border-primary/30"
                  style={{ animation: 'none' }}
                >
                  <CaretRight size={32} weight="bold" className="text-primary" />
                </Button>
                <Badge variant="outline" className="text-[10px] font-mono">
                  NEXT
                </Badge>
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs font-mono text-muted-foreground tracking-widest opacity-60">
                VINTAGE RADIO • STEREO SOUND
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
