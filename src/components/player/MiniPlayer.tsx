import { ArrowsOut, Play, Pause, SkipBack, SkipForward } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState } from 'react'

interface MiniPlayerProps {
  onExitMiniMode: () => void
}

export function MiniPlayer({ onExitMiniMode }: MiniPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <TooltipProvider>
      <div className="w-screen h-screen flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md glassmorphic p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h2 className="text-lg font-bold tracking-tight line-clamp-1">Current Track</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">Artist Name</p>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onExitMiniMode}
                  className="h-8 w-8 hover:bg-accent/20 hover:text-accent"
                >
                  <ArrowsOut size={16} weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Full Player</TooltipContent>
            </Tooltip>
          </div>

          <div className="aspect-square w-full rounded-xl bg-gradient-to-br from-primary to-accent/50 flex items-center justify-center">
            <div className="text-6xl">🎵</div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full hover:bg-primary/20"
                >
                  <SkipBack size={20} weight="fill" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-14 w-14 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-110 active:scale-95 transition-all"
                >
                  {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full hover:bg-primary/20"
                >
                  <SkipForward size={20} weight="fill" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next</TooltipContent>
            </Tooltip>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Mini Player Mode • Controls synced with YouTube Music
          </div>
        </Card>
      </div>
    </TooltipProvider>
  )
}
