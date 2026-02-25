import { useState, useEffect, useCallback, useRef, RefObject } from 'react'

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

export interface PlaylistShelf {
  title: string
  tracks: RecommendedTrack[]
}

export type UseYouTubeMusicReturn = ReturnType<typeof useYouTubeMusic>

const LAST_PLAYING_TRACK_URL_KEY = 'tunebox:last-playing-track-url'
const PENDING_TRACK_TIMEOUT_MS = 15000

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
  const isPlayingRef = useRef(false)
  const [recommendedTracks, setRecommendedTracks] = useState<RecommendedTrack[]>([])
  const [allPlaylists, setAllPlaylists] = useState<PlaylistShelf[]>([])
  const [upNextTracks, setUpNextTracks] = useState<RecommendedTrack[]>([])
  const [videoEnded, setVideoEnded] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [webviewReady, setWebviewReady] = useState(false)
  const pendingTrackRef = useRef<{ title: string; artist?: string; thumbnail?: string; url: string; startedAt: number } | null>(null)
  const desiredVolumeRef = useRef(70)

  const normalizeStateText = useCallback((text?: string) => (text || '').replace(/\s+/g, '').toLowerCase(), [])

  const getLastPlayingTrackUrl = useCallback((): string | null => {
    try {
      const url = window.localStorage.getItem(LAST_PLAYING_TRACK_URL_KEY)
      return url && url.trim().length > 0 ? url : null
    } catch {
      return null
    }
  }, [])

  const setLastPlayingTrackUrl = useCallback((url?: string) => {
    if (!url) return
    try {
      window.localStorage.setItem(LAST_PLAYING_TRACK_URL_KEY, url)
    } catch {
      // ignore localStorage errors
    }
  }, [])

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
    // Use ref to avoid stale closure during rapid clicks
    const willPlay = !isPlayingRef.current
    isPlayingRef.current = willPlay
    setPlaybackState(prev => ({ ...prev, isPlaying: willPlay }))
    if (willPlay) {
      play()
    } else {
      pause()
    }
  }, [play, pause])

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
    desiredVolumeRef.current = volume
    sendCommand('setVolume', { volume })
    setPlaybackState(prev => ({ ...prev, volume }))
  }, [sendCommand])

  const reapplyDesiredVolume = useCallback((delays: number[] = [300]) => {
    const volume = desiredVolumeRef.current
    sendCommand('setVolume', { volume })
    for (const delay of delays) {
      window.setTimeout(() => {
        sendCommand('setVolume', { volume: desiredVolumeRef.current })
      }, delay)
    }
  }, [sendCommand])

  const playTrack = useCallback((url: string) => {
    sendCommand('playTrack', { url })
    reapplyDesiredVolume([500, 1200, 2500, 4000])
  }, [sendCommand, reapplyDesiredVolume])

  const refreshPage = useCallback(() => {
    sendCommand('refreshPage')
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
        let acceptedTrackChanged = trackChanged
        if (state.title) lastTitle = state.title
        if (state.artist) lastArtist = state.artist

        if (state.title || state.artist) {
          const pending = pendingTrackRef.current
          let shouldApplyIncoming = true
          let preservedThumbnail: string | undefined

          if (pending) {
            const incomingTitle = normalizeStateText(state.title)
            const expectedTitle = normalizeStateText(pending.title)
            const matchedExpected =
              !!incomingTitle &&
              !!expectedTitle &&
              (incomingTitle === expectedTitle || incomingTitle.includes(expectedTitle) || expectedTitle.includes(incomingTitle))

            if (matchedExpected) {
              // New track confirmed loaded — preserve playlist thumbnail if
              // YT Music hasn't provided one yet (still loading player bar)
              if (!state.thumbnail && pending.thumbnail) {
                preservedThumbnail = pending.thumbnail
              }
              pendingTrackRef.current = null
              // Clear navigation cooldown — track successfully loaded
              navigationCooldownRef.current = false
              if (navigationCooldownTimerRef.current) {
                clearTimeout(navigationCooldownTimerRef.current)
                navigationCooldownTimerRef.current = null
              }
            } else if (Date.now() - pending.startedAt < PENDING_TRACK_TIMEOUT_MS) {
              shouldApplyIncoming = false
              acceptedTrackChanged = false
            } else {
              pendingTrackRef.current = null
            }
          }

          if (shouldApplyIncoming) {
            setTrackInfo({
              title: state.title || 'YouTube Music',
              artist: state.artist || '',
              thumbnail: state.thumbnail || preservedThumbnail || undefined
            })
          }
          setIsConnected(true)
        }

        // Forward videoEnded flag
        if (state.videoEnded) {
          setVideoEnded(true)
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

        if (Array.isArray(state.allPlaylists)) {
          const shelves = state.allPlaylists
            .filter((shelf: unknown) => {
              if (!shelf || typeof shelf !== 'object') return false
              const candidate = shelf as { title?: unknown; tracks?: unknown }
              return typeof candidate.title === 'string' && Array.isArray(candidate.tracks)
            })
            .map((shelf: unknown) => {
              const candidate = shelf as { title: string; tracks: unknown[] }
              const tracks = candidate.tracks
                .filter((item: unknown) => {
                  if (!item || typeof item !== 'object') return false
                  const track = item as { title?: unknown }
                  return typeof track.title === 'string' && track.title.trim().length > 0
                })
                .map((item: unknown) => {
                  const track = item as {
                    title: string
                    artist?: unknown
                    url?: unknown
                    thumbnail?: unknown
                  }

                  return {
                    title: track.title,
                    artist: typeof track.artist === 'string' ? track.artist : undefined,
                    url: typeof track.url === 'string' ? track.url : undefined,
                    thumbnail: typeof track.thumbnail === 'string' ? track.thumbnail : undefined
                  }
                })

              return {
                title: candidate.title,
                tracks
              }
            })

          setAllPlaylists(shelves)
        }

        // Parse Up Next queue tracks
        if (Array.isArray((state as any).upNextTracks)) {
          const uTracks = ((state as any).upNextTracks as unknown[])
            .filter((item: unknown) => {
              if (!item || typeof item !== 'object') return false
              const candidate = item as { title?: unknown; url?: unknown }
              return typeof candidate.title === 'string' && candidate.title.trim().length > 0
                  && typeof candidate.url === 'string' && candidate.url.length > 0
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
          if (uTracks.length > 0) {
            setUpNextTracks(uTracks)
          }
        }

        setPlaybackState(prev => {
          const newIsPlaying = state.isPlaying ?? prev.isPlaying
          const nextCurrentTime = typeof state.currentTime === 'number' && Number.isFinite(state.currentTime)
            ? state.currentTime
            : prev.currentTime
          const nextDuration = typeof state.duration === 'number' && Number.isFinite(state.duration)
            ? state.duration
            : prev.duration
          isPlayingRef.current = newIsPlaying
          if (acceptedTrackChanged) {
            reapplyDesiredVolume([500])
            return {
              ...prev,
              isPlaying: newIsPlaying,
              currentTime: nextCurrentTime,
              duration: nextDuration
            }
          }
          return {
            ...prev,
            isPlaying: newIsPlaying,
            currentTime: nextCurrentTime,
            duration: nextDuration
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
  }, [normalizeStateText, reapplyDesiredVolume])

  // ─── Disliked tracks persistence (localStorage) ─────────────────────
  const DISLIKED_TRACKS_KEY = 'tunebox:disliked-tracks'

  const loadDislikedUrls = useCallback((): Set<string> => {
    try {
      const raw = window.localStorage.getItem(DISLIKED_TRACKS_KEY)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) return new Set(arr)
      }
    } catch {}
    return new Set()
  }, [])

  const dislikedUrlsRef = useRef<Set<string>>(loadDislikedUrls())

  const persistDislikedUrls = useCallback(() => {
    try {
      window.localStorage.setItem(DISLIKED_TRACKS_KEY, JSON.stringify([...dislikedUrlsRef.current]))
    } catch {}
  }, [])

  // ─── Playlist management ───────────────────────────────────────────
  const MAX_PLAYLIST_SIZE = 200
  const [playlist, setPlaylist] = useState<RecommendedTrack[]>([])
  const [playlistIndex, setPlaylistIndex] = useState(-1)
  const [playedHistory, setPlayedHistory] = useState<RecommendedTrack[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const playlistRef = useRef<RecommendedTrack[]>([])
  const playlistIndexRef = useRef(-1)
  const playedHistoryRef = useRef<RecommendedTrack[]>([])
  const playlistKeysRef = useRef<Set<string>>(new Set())
  const playedUrlsRef = useRef<Set<string>>(new Set()) // memory-only, cleared on restart
  const playlistExhaustedRef = useRef(false)
  const isRefreshingForMoreRef = useRef(false)
  const navigationCooldownRef = useRef(false)
  const navigationCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevTrackTitleRef = useRef('')
  const autoAdvanceGuardRef = useRef(0) // Monotonic counter to prevent double auto-advance
  const endSwitchArmedRef = useRef(false)
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false)

  const normalizeText = useCallback((text?: string) => (text || '').replace(/\s+/g, '').toLowerCase(), [])
  const buildTrackKey = useCallback((track: { title?: string; artist?: string; url?: string }) => {
    return `${track.url || ''}|${normalizeText(track.title)}|${normalizeText(track.artist)}`
  }, [normalizeText])

  // Helper: set navigation cooldown to prevent title-change watcher from interfering.
  // The cooldown is cleared early when the pending track is confirmed loaded (in the
  // IPC state handler). The 15s timeout is a safety net for cases where matching fails.
  const startNavigationCooldown = useCallback(() => {
    navigationCooldownRef.current = true
    if (navigationCooldownTimerRef.current) clearTimeout(navigationCooldownTimerRef.current)
    navigationCooldownTimerRef.current = setTimeout(() => {
      navigationCooldownRef.current = false
    }, 15000)
  }, [])

  // Mark a track as played this session (memory only)
  const markAsPlayed = useCallback((track: RecommendedTrack) => {
    if (track.url) playedUrlsRef.current.add(track.url)
  }, [])

  // Push current track to played history before navigating away
  const pushToHistory = useCallback((idx: number) => {
    const pl = playlistRef.current
    if (idx < 0 || idx >= pl.length) return
    const track = pl[idx]
    if (!track) return
    const history = playedHistoryRef.current
    // Don't duplicate the top of the history stack
    if (history.length > 0 && history[history.length - 1].url === track.url) return
    const newHistory = [...history, track]
    playedHistoryRef.current = newHistory
    setPlayedHistory(newHistory)
  }, [])

  // Play a track from the playlist by index
  const playFromPlaylist = useCallback((idx: number, opts?: { skipHistory?: boolean }) => {
    const pl = playlistRef.current
    if (idx < 0 || idx >= pl.length) return false
    const track = pl[idx]
    if (!track?.url) return false

    // Push the currently playing track to history before switching
    if (!opts?.skipHistory && playlistIndexRef.current >= 0) {
      pushToHistory(playlistIndexRef.current)
    }

    pendingTrackRef.current = {
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      url: track.url,
      startedAt: Date.now()
    }
    setTrackInfo({
      title: track.title || 'YouTube Music',
      artist: track.artist || '',
      thumbnail: track.thumbnail || undefined
    })
    setLastPlayingTrackUrl(track.url)
    markAsPlayed(track)

    startNavigationCooldown()
    playTrack(track.url)
    playlistIndexRef.current = idx
    setPlaylistIndex(idx)
    playlistExhaustedRef.current = false
    isRefreshingForMoreRef.current = false
    setIsLoadingMore(false)
    setVideoEnded(false)

    // Preload next track for instant switching
    setTimeout(() => {
      const nextIdx = idx + 1
      const currentPl = playlistRef.current
      if (nextIdx < currentPl.length && currentPl[nextIdx]?.url) {
        sendCommand('preloadTrack', { url: currentPl[nextIdx].url })
      }
    }, 3000)

    return true
  }, [playTrack, pushToHistory, setLastPlayingTrackUrl, startNavigationCooldown, markAsPlayed, sendCommand])

  // Request more songs by refreshing YT Music homepage
  const requestMoreSongs = useCallback(() => {
    if (isRefreshingForMoreRef.current) return
    isRefreshingForMoreRef.current = true
    setIsLoadingMore(true)

    // Keep existing playlist keys to avoid re-adding same tracks
    // (they'll be filtered by playedUrlsRef and dislikedUrlsRef anyway)
    refreshPage()
  }, [refreshPage])

  // Play next track from playlist (NO YT Music queue fallback)
  const playNextFromPlaylist = useCallback(() => {
    const idx = playlistIndexRef.current
    const pl = playlistRef.current

    if (idx >= 0 && idx < pl.length - 1) {
      playFromPlaylist(idx + 1)
      return
    }

    // Playlist exhausted — request more songs
    playlistExhaustedRef.current = true
    requestMoreSongs()
  }, [playFromPlaylist, requestMoreSongs])

  // Play previous track from history (NO YT Music queue fallback)
  const playPreviousFromPlaylist = useCallback(() => {
    const history = playedHistoryRef.current
    if (history.length === 0) return // No history — do nothing

    const prevTrack = history[history.length - 1]
    const newHistory = history.slice(0, -1)
    playedHistoryRef.current = newHistory
    setPlayedHistory(newHistory)

    if (!prevTrack?.url) return

    // Find this track's index in playlist, or play it directly
    const pl = playlistRef.current
    const prevIdx = pl.findIndex(t => t.url === prevTrack.url)

    pendingTrackRef.current = {
      title: prevTrack.title,
      artist: prevTrack.artist,
      thumbnail: prevTrack.thumbnail,
      url: prevTrack.url,
      startedAt: Date.now()
    }
    setTrackInfo({
      title: prevTrack.title || 'YouTube Music',
      artist: prevTrack.artist || '',
      thumbnail: prevTrack.thumbnail || undefined
    })
    setLastPlayingTrackUrl(prevTrack.url)

    startNavigationCooldown()
    playTrack(prevTrack.url)

    if (prevIdx >= 0) {
      playlistIndexRef.current = prevIdx
      setPlaylistIndex(prevIdx)
    }
    playlistExhaustedRef.current = false
    isRefreshingForMoreRef.current = false
    setIsLoadingMore(false)
    setVideoEnded(false)

    // Preload the forward track for instant switching
    setTimeout(() => {
      const currentIdx = playlistIndexRef.current
      const currentPl = playlistRef.current
      if (currentIdx >= 0 && currentIdx < currentPl.length - 1 && currentPl[currentIdx + 1]?.url) {
        sendCommand('preloadTrack', { url: currentPl[currentIdx + 1].url })
      }
    }, 3000)
  }, [playTrack, setLastPlayingTrackUrl, startNavigationCooldown, sendCommand])

  // Dislike current track: send dislike to YT Music + remove from playlist + persist + play next
  const handleDislikeAndNext = useCallback(() => {
    const idx = playlistIndexRef.current
    const pl = playlistRef.current
    if (idx < 0 || idx >= pl.length) return

    const track = pl[idx]

    // 1. Send dislike command to YT Music
    sendCommand('dislike')

    // 2. Persist to disliked list (so this track never re-appears)
    if (track.url) {
      dislikedUrlsRef.current.add(track.url)
      persistDislikedUrls()
    }

    // 3. Remove from playlist
    const removedKey = buildTrackKey(track)
    playlistKeysRef.current.delete(removedKey)
    const nextPl = pl.filter((_, i) => i !== idx)
    playlistRef.current = nextPl
    setPlaylist(nextPl)

    // 4. Reset current index so playFromPlaylist doesn't push the disliked track to history
    playlistIndexRef.current = -1

    // 5. Play the track now at position `idx` (was idx+1 before removal)
    if (idx < nextPl.length) {
      playFromPlaylist(idx, { skipHistory: false })
    } else if (nextPl.length > 0) {
      // Removed the last track, wrap to first unplayed
      playFromPlaylist(0, { skipHistory: false })
    } else {
      // No tracks left, request more
      playlistExhaustedRef.current = true
      requestMoreSongs()
    }
  }, [sendCommand, buildTrackKey, playFromPlaylist, requestMoreSongs, persistDislikedUrls])

  // Remove the currently playing track from the playlist
  const removeCurrentFromPlaylist = useCallback(() => {
    const idx = playlistIndexRef.current
    const pl = playlistRef.current
    if (idx < 0 || idx >= pl.length) return

    const removedKey = buildTrackKey(pl[idx])
    playlistKeysRef.current.delete(removedKey)

    const nextPl = pl.filter((_, i) => i !== idx)
    playlistRef.current = nextPl
    setPlaylist(nextPl)

    const newIdx = Math.max(idx - 1, -1)
    playlistIndexRef.current = newIdx
    setPlaylistIndex(newIdx)
  }, [buildTrackKey])

  // Reset playlist state (used before refreshing the page for full rebuild)
  const resetPlaylist = useCallback(() => {
    playlistKeysRef.current.clear()
    playlistRef.current = []
    playlistIndexRef.current = -1
    playlistExhaustedRef.current = false
    isRefreshingForMoreRef.current = false
    prevTrackTitleRef.current = ''
    playedHistoryRef.current = []
    pendingTrackRef.current = null
    setPlaylist([])
    setPlaylistIndex(-1)
    setPlayedHistory([])
    setIsLoadingMore(false)
    setHasAutoPlayed(false)
  }, [])

  // ─── Effects ───────────────────────────────────────────────────────

  // Helper: add tracks to playlist with dedup + dislike + played filtering
  const addTracksToPlaylist = useCallback((incoming: RecommendedTrack[]) => {
    if (incoming.length === 0) return
    setPlaylist(prev => {
      const nextPl = [...prev]
      for (const track of incoming) {
        if (nextPl.length >= MAX_PLAYLIST_SIZE) break
        if (!track?.url) continue
        if (dislikedUrlsRef.current.has(track.url)) continue
        if (playedUrlsRef.current.has(track.url)) continue
        const key = buildTrackKey(track)
        if (playlistKeysRef.current.has(key)) continue
        playlistKeysRef.current.add(key)
        nextPl.push(track)
      }
      playlistRef.current = nextPl
      return nextPl
    })
  }, [buildTrackKey])

  // 1. Ingest tracks from recommended (first shelf — legacy compat)
  useEffect(() => {
    addTracksToPlaylist(recommendedTracks)
  }, [recommendedTracks, addTracksToPlaylist])

  // 1b. Ingest tracks from ALL homepage shelves
  useEffect(() => {
    if (allPlaylists.length === 0) return
    const flat: RecommendedTrack[] = []
    for (const shelf of allPlaylists) {
      for (const track of shelf.tracks) {
        flat.push(track)
      }
    }
    addTracksToPlaylist(flat)
  }, [allPlaylists, addTracksToPlaylist])

  // 1c. Ingest tracks from "Up Next" queue (continuously available while playing)
  useEffect(() => {
    addTracksToPlaylist(upNextTracks)
  }, [upNextTracks, addTracksToPlaylist])

  // 2. Auto-play first track when playlist is ready (on app startup)
  useEffect(() => {
    if (hasAutoPlayed) return
    if (playlist.length === 0) return

    const lastUrl = getLastPlayingTrackUrl()
    let startIndex = 0
    if (lastUrl) {
      const foundIndex = playlist.findIndex(track => track.url === lastUrl)
      if (foundIndex >= 0) {
        startIndex = foundIndex
      }
    }

    const target = playlist[startIndex]
    if (target?.url) {
      playFromPlaylist(startIndex, { skipHistory: true })
      setHasAutoPlayed(true)
    }
  }, [playlist, hasAutoPlayed, playFromPlaylist, getLastPlayingTrackUrl])

  // 3. Auto-advance when song ends (videoEnded event from webview)
  useEffect(() => {
    if (!videoEnded) return
    setVideoEnded(false)

    // If navigation cooldown is active, a user-initiated skip already triggered the next track
    if (navigationCooldownRef.current) return

    // Bump guard so the title-change watcher (Effect #4) won't also trigger
    autoAdvanceGuardRef.current++
    playNextFromPlaylist()
  }, [videoEnded, playNextFromPlaylist])

  // 3b. Preemptive auto-advance a split-second before ending.
  // This avoids briefly hearing YT Music's own autoplay queue track.
  // Strategy: ~1.2s before the end, PAUSE FIRST (with retries to ensure it takes effect),
  // then navigate to our next track after a short delay. This guarantees no audio bleed
  // from YT Music's own queue even if our navigation has a slight delay.
  useEffect(() => {
    if (!playbackState.isPlaying) return
    if (navigationCooldownRef.current) return
    if (playbackState.duration <= 0) return

    const remaining = playbackState.duration - playbackState.currentTime

    // Reset arm when well away from the end
    if (remaining > 1.5 || playbackState.currentTime < 2) {
      endSwitchArmedRef.current = false
      return
    }

    if (remaining <= 1.2 && !endSwitchArmedRef.current) {
      endSwitchArmedRef.current = true
      autoAdvanceGuardRef.current++

      // Step 1: Immediately send pauseBeforeTrackEnd — this mutes+pauses at the
      // main-process level and sets __tuneboxAwaitingOurNavigation=true so that
      // when the song's 'ended' event fires YT Music cannot play its own next track.
      sendCommand('pauseBeforeTrackEnd')

      // Retry the pause command a few times to make it robust against timing races.
      const pauseRetryDelays = [150, 350, 600]
      for (const delay of pauseRetryDelays) {
        window.setTimeout(() => {
          if (endSwitchArmedRef.current) sendCommand('pauseBeforeTrackEnd')
        }, delay)
      }

      // Step 2: After pause has had time to settle, switch to our next playlist track.
      // 700ms gives the pause retries time to run while still switching well before
      // the song would naturally end.
      window.setTimeout(() => {
        playNextFromPlaylist()
      }, 700)
    }
  }, [playbackState.isPlaying, playbackState.currentTime, playbackState.duration, playNextFromPlaylist, sendCommand])

  // 4. Detect title change — if YT Music auto-advanced on its own,
  //    redirect to our next playlist song
  useEffect(() => {
    const currentTitle = normalizeText(trackInfo.title)
    if (!currentTitle) return

    const prevTitle = prevTrackTitleRef.current
    prevTrackTitleRef.current = currentTitle

    if (!prevTitle || currentTitle === prevTitle) return
    if (navigationCooldownRef.current) return

    // If Effect #3 (videoEnded) already triggered an auto-advance recently,
    // skip this to avoid a double playTrack race.
    const guardBefore = autoAdvanceGuardRef.current
    if (guardBefore > 0) {
      // Consume the guard — the next title change (if any) can proceed
      autoAdvanceGuardRef.current = 0
      return
    }

    const idx = playlistIndexRef.current
    const pl = playlistRef.current

    if (idx >= 0 && idx < pl.length - 1) {
      playFromPlaylist(idx + 1)
    } else if (pl.length > 0 && idx >= pl.length - 1) {
      playlistExhaustedRef.current = true
      requestMoreSongs()
    }
  }, [trackInfo.title, playFromPlaylist, normalizeText, requestMoreSongs])

  // 5. When new tracks arrive after a "request more songs" refresh, auto-continue
  useEffect(() => {
    if (!isRefreshingForMoreRef.current) return
    if (!playlistExhaustedRef.current) return

    const idx = playlistIndexRef.current
    const pl = playlistRef.current

    // New tracks were added beyond the current index
    if (pl.length > 0 && idx < pl.length - 1) {
      playFromPlaylist(idx + 1)
    }
  }, [playlist, playFromPlaylist])

  // 6. Preemptive refill: when remaining tracks fall below threshold,
  //    request more songs BEFORE running out (no interruption to playback)
  const PREEMPTIVE_REFILL_THRESHOLD = 3
  useEffect(() => {
    if (!hasAutoPlayed) return // Don't refill before first play
    const idx = playlistIndexRef.current
    const pl = playlistRef.current
    const remaining = pl.length - idx - 1
    if (remaining <= PREEMPTIVE_REFILL_THRESHOLD && remaining >= 0) {
      requestMoreSongs()
    }
  }, [playlistIndex, hasAutoPlayed, requestMoreSongs])

  return {
    trackInfo,
    playbackState,
    recommendedTracks,
    allPlaylists,
    playlist,
    playlistIndex,
    playedHistory,
    isLoadingMore,
    videoEnded,
    setVideoEnded,
    isConnected,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    dislike,
    nextAndDislike,
    seek,
    setVolume,
    playTrack,
    playFromPlaylist,
    playNextFromPlaylist,
    playPreviousFromPlaylist,
    handleDislikeAndNext,
    removeCurrentFromPlaylist,
    resetPlaylist,
    refreshPage
  }
}
