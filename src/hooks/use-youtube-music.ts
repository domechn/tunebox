import { useState, useEffect, useCallback, useMemo, RefObject } from 'react'

export interface WebviewLikeElement extends HTMLElement {
  executeJavaScript?: (code: string) => Promise<unknown>
  contentWindow?: Window | null
}

export type YouTubeEmbedElement = HTMLIFrameElement | WebviewLikeElement

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

export interface RecommendedTrack {
  title: string
  artist?: string
  url?: string
  thumbnail?: string
}

export function useYouTubeMusic(playerRef: RefObject<YouTubeEmbedElement | null>) {
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
  const [recommendedTracks, setRecommendedTracks] = useState<RecommendedTrack[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [webviewReady, setWebviewReady] = useState(false)

  // Listen for the webview's dom-ready event so we don't call
  // executeJavaScript before the guest page is loaded.
  useEffect(() => {
    const el = playerRef.current
    if (!el) return

    const onReady = () => setWebviewReady(true)

    // Webview elements emit 'dom-ready' when the guest is loaded
    el.addEventListener('dom-ready', onReady)
    return () => {
      el.removeEventListener('dom-ready', onReady)
    }
  }, [playerRef])

  const sendCommand = useCallback((command: string, data?: any) => {
    // Prefer IPC through main process (reliable across OOPIF boundary)
    const win = window as Window & { electron?: { sendCommand?: (cmd: string, data?: any) => Promise<any> } }
    if (win.electron?.sendCommand) {
      win.electron.sendCommand(command, data).catch(() => {})
      return
    }

    // Fallback for non-Electron / iframe usage
    const target = playerRef.current
    if (!target) return

    if (!webviewReady && typeof (target as WebviewLikeElement).executeJavaScript === 'function') return

    const payload = {
      type: 'ytmusic-command',
      command,
      data
    }

    try {
      if (typeof (target as WebviewLikeElement).executeJavaScript === 'function') {
        const serialized = JSON.stringify(payload)
        ;(target as WebviewLikeElement).executeJavaScript!(`window.postMessage(${serialized}, '*')`)
        return
      }

      if (target.contentWindow) {
        target.contentWindow.postMessage(payload, '*')
      }
    } catch (e) {
      console.error('Failed to send command:', e)
    }
  }, [playerRef, webviewReady])

  const play = useCallback(() => {
    sendCommand('play')
  }, [sendCommand])

  const pause = useCallback(() => {
    sendCommand('pause')
  }, [sendCommand])

  const togglePlayPause = useCallback(() => {
    // Optimistically flip the state so the button responds immediately
    // (the polling IPC update ~1s later will reconcile with true state)
    setPlaybackState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
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

  const seek = useCallback((time: number) => {
    sendCommand('seek', { time })
    setPlaybackState(prev => ({ ...prev, currentTime: time }))
  }, [sendCommand])

  const setVolume = useCallback((volume: number) => {
    sendCommand('setVolume', { volume })
    setPlaybackState(prev => ({ ...prev, volume }))
  }, [sendCommand])

  useEffect(() => {
    // In Electron, the webview runs in a separate renderer process (OOPIF).
    // window.parent.postMessage does NOT cross that boundary, so we receive
    // state via the main-process polling IPC channel instead.
    let lastTitle = ''
    let lastArtist = ''
    const win = window as Window & { electron?: { onYouTubeMusicState?: (cb: (s: any) => void) => (() => void) | void } }
    if (win.electron?.onYouTubeMusicState) {
      const unsub = win.electron.onYouTubeMusicState((state) => {
        const trackChanged = (state.title && state.title !== lastTitle) || (state.artist && state.artist !== lastArtist)
        if (state.title) lastTitle = state.title
        if (state.artist) lastArtist = state.artist

        if (state.title || state.artist) {
          setTrackInfo({
            title: state.title || 'YouTube Music',
            artist: state.artist || '',
            thumbnail: state.thumbnail || undefined
          })
          setIsConnected(true)
        }

        if (Array.isArray(state.recommendedTracks)) {
          const tracks = state.recommendedTracks
            .filter((item: unknown) => {
              if (!item || typeof item !== 'object') return false
              const candidate = item as { title?: unknown }
              return typeof candidate.title === 'string' && candidate.title.trim().length > 0
            })
            .map((item: unknown) => {
              const candidate = item as {
                title: string
                artist?: unknown
                url?: unknown
                thumbnail?: unknown
              }

              return {
                title: candidate.title,
                artist: typeof candidate.artist === 'string' ? candidate.artist : undefined,
                url: typeof candidate.url === 'string' ? candidate.url : undefined,
                thumbnail: typeof candidate.thumbnail === 'string' ? candidate.thumbnail : undefined
              }
            })

          setRecommendedTracks(tracks)
        }

        setPlaybackState(prev => {
          if (trackChanged) {
            return {
              ...prev,
              isPlaying: state.isPlaying ?? prev.isPlaying,
              currentTime: 0,
              duration: 0
            }
          }
          return {
            ...prev,
            isPlaying: state.isPlaying ?? prev.isPlaying,
            currentTime: state.currentTime ?? prev.currentTime,
            duration: state.duration ?? prev.duration
          }
        })
      })
      return () => { unsub?.() }
    }

    // Fallback for non-Electron / iframe usage
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
    recommendedTracks,
    isConnected,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    dislike,
    nextAndDislike,
    seek,
    setVolume
  }
}
