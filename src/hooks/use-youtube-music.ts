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
  const [lyrics, setLyrics] = useState<string[]>([])
  const [currentLyric, setCurrentLyric] = useState('')
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
      if (typeof target.executeJavaScript === 'function') {
        const serialized = JSON.stringify(payload)
        target.executeJavaScript(`window.postMessage(${serialized}, '*')`)
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
        if (state.lyrics) {
          setLyrics(state.lyrics.split('\n').filter((l: string) => l.trim()))
        }
        setCurrentLyric(state.currentLyric || '')
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

        case 'ytmusic-lyrics': {
          const lyricsArray = event.data.lyrics
            ? event.data.lyrics.split('\n').filter((line: string) => line.trim())
            : []
          setLyrics(lyricsArray)
          break
        }

        case 'ytmusic-connection':
          setIsConnected(event.data.connected)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Resolve the current lyric line: prefer synced currentLyric from DOM,
  // fall back to linear estimation from lyrics array
  const currentLyricText = useMemo(() => {
    if (currentLyric) return currentLyric
    if (lyrics.length > 0 && playbackState.duration > 0) {
      const progress = playbackState.currentTime / playbackState.duration
      const index = Math.min(Math.floor(progress * lyrics.length), lyrics.length - 1)
      return lyrics[index] || ''
    }
    return ''
  }, [currentLyric, lyrics, playbackState.currentTime, playbackState.duration])

  return {
    trackInfo,
    playbackState,
    lyrics,
    currentLyricText,
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
