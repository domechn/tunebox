import { useState, useEffect, useCallback, RefObject } from 'react'

export interface TrackInfo {
  title: string
  artist: string
  album?: string
  thumbnail?: string
  duration?: number
}

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
}

export function useYouTubeMusic(iframeRef: RefObject<HTMLIFrameElement | null>) {
  const [trackInfo, setTrackInfo] = useState<TrackInfo>({
    title: 'YouTube Music',
    artist: 'Connect to start streaming'
  })
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 70
  })
  const [lyrics, setLyrics] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const sendCommand = useCallback((command: string, data?: any) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'ytmusic-command',
          command,
          data
        }, '*')
      } catch (e) {
        console.error('Failed to send command:', e)
      }
    }
  }, [iframeRef])

  const play = useCallback(() => {
    sendCommand('play')
  }, [sendCommand])

  const pause = useCallback(() => {
    sendCommand('pause')
  }, [sendCommand])

  const togglePlayPause = useCallback(() => {
    if (playbackState.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [playbackState.isPlaying, play, pause])

  const next = useCallback(() => {
    sendCommand('next')
  }, [sendCommand])

  const previous = useCallback(() => {
    sendCommand('previous')
  }, [sendCommand])

  const dislike = useCallback(() => {
    sendCommand('dislike')
  }, [sendCommand])

  const nextAndDislike = useCallback(() => {
    dislike()
    setTimeout(() => next(), 150)
  }, [dislike, next])

  const setVolume = useCallback((volume: number) => {
    sendCommand('setVolume', { volume })
    setPlaybackState(prev => ({ ...prev, volume }))
  }, [sendCommand])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return

      switch (event.data.type) {
        case 'ytmusic-track-info':
          setTrackInfo({
            title: event.data.title || 'Unknown Track',
            artist: event.data.artist || 'Unknown Artist',
            album: event.data.album,
            thumbnail: event.data.thumbnail,
            duration: event.data.duration
          })
          setIsConnected(true)
          break

        case 'ytmusic-playback-state':
          setPlaybackState(prev => ({
            ...prev,
            isPlaying: event.data.isPlaying ?? prev.isPlaying,
            currentTime: event.data.currentTime ?? prev.currentTime,
            duration: event.data.duration ?? prev.duration
          }))
          break

        case 'ytmusic-lyrics':
          const lyricsArray = event.data.lyrics 
            ? event.data.lyrics.split('\n').filter((line: string) => line.trim())
            : []
          setLyrics(lyricsArray)
          break

        case 'ytmusic-connection':
          setIsConnected(event.data.connected)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return {
    trackInfo,
    playbackState,
    lyrics,
    isConnected,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    dislike,
    nextAndDislike,
    setVolume
  }
}
