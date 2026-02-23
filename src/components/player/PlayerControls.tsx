import { Play, Pause, SkipBack, SkipForward, SpeakerHigh, SpeakerX, PictureInPicture } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useState } from 'react'

interface PlayerControlsProps {
  onMiniModeToggle: () => void
}

export function PlayerControls({ onMiniModeToggle }: PlayerControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState([70])
  const isMuted = volume[0] === 0

  return (
    <div className="glassmorphic rounded-2xl p-6">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-12 w-12 rounded-full hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all"
              >
                <SkipBack size={24} weight="fill" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-16 w-16 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-110 active:scale-95 transition-all shadow-lg"
                style={{ animation: isPlaying ? 'pulse-glow 2s infinite' : 'none' }}
              >
                {isPlaying ? <Pause size={32} weight="fill" /> : <Play size={32} weight="fill" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-12 w-12 rounded-full hover:bg-primary/20 hover:scale-110 active:scale-95 transition-all"
              >
                <SkipForward size={24} weight="fill" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-4 min-w-[200px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setVolume(volume[0] === 0 ? [70] : [0])}
                className="h-10 w-10 hover:bg-primary/20 transition-colors"
              >
                {isMuted ? <SpeakerX size={20} weight="fill" /> : <SpeakerHigh size={20} weight="fill" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
          </Tooltip>

          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="w-32"
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onMiniModeToggle}
                className="h-10 w-10 hover:bg-accent/20 hover:text-accent transition-colors"
              >
                <PictureInPicture size={20} weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mini Player</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
