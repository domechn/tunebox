import { useEffect, useState } from 'react'
import type { PlaylistShelf, UseYouTubeMusicReturn } from '@/hooks/use-youtube-music'

interface PlaylistDebugPageProps {
  ytMusic: UseYouTubeMusicReturn
  onBack: () => void
}

export function PlaylistDebugPage({ ytMusic, onBack }: PlaylistDebugPageProps) {
  const { allPlaylists, recommendedTracks, trackInfo, playbackState, isConnected, playlist, playlistIndex, playedHistory } = ytMusic
  const [displayPlaylists, setDisplayPlaylists] = useState<PlaylistShelf[]>(allPlaylists)
  const [displayRecommendedCount, setDisplayRecommendedCount] = useState<number>(recommendedTracks.length)
  const [isListCleared, setIsListCleared] = useState(false)

  useEffect(() => {
    if (isListCleared) return
    setDisplayPlaylists(allPlaylists)
    setDisplayRecommendedCount(recommendedTracks.length)
  }, [allPlaylists, recommendedTracks, isListCleared])

  const handleClearCurrentList = () => {
    setDisplayPlaylists([])
    setDisplayRecommendedCount(0)
    setIsListCleared(true)
  }

  const handleRestoreList = () => {
    setIsListCleared(false)
    setDisplayPlaylists(allPlaylists)
    setDisplayRecommendedCount(recommendedTracks.length)
  }

  return (
    <div className="player-shell" style={{ overflow: 'hidden' }}>
      <div className="top-bar">
        <button className="physical-btn" onClick={onBack} title="Back">
          ←
        </button>
        <div className="app-brand">
          <span className="app-brand-text">DEBUG</span>
        </div>
        <div style={{ width: 26 }} />
      </div>

      <div className="screen-container" style={{ padding: '10px 12px', overflowY: 'auto', alignItems: 'stretch' }}>
        <div className="login-card" style={{ textAlign: 'left', width: '100%', maxWidth: '100%' }}>
          <div className="login-status">Connected: {String(isConnected)}</div>
          <div className="login-status">Now Playing: {trackInfo.title} — {trackInfo.artist}</div>
          <div className="login-status">Playback: {playbackState.isPlaying ? 'playing' : 'paused'}</div>
          <div className="login-status">Recommended (from YTM): {displayRecommendedCount}</div>
          <div className="login-status">YTM Shelves: {displayPlaylists.length}</div>
          <div className="login-status" style={{ fontWeight: 'bold' }}>
            Internal Playlist: {playlist.length} tracks (playing #{playlistIndex + 1})
          </div>
          <div className="login-status">
            Played History: {playedHistory.length} tracks
          </div>
          {isListCleared ? (
            <>
              <div className="login-status" style={{ marginTop: 8 }}>当前展示已手动清空（已暂停自动刷新）</div>
              <button onClick={handleRestoreList} className="login-btn" style={{ marginTop: 8 }}>
                恢复列表
              </button>
            </>
          ) : (
            <button onClick={handleClearCurrentList} className="login-btn" style={{ marginTop: 8 }}>
              清空当前列表
            </button>
          )}
        </div>

        {/* Internal Playlist (actual queue) */}
        {playlist.length > 0 && (
          <div className="login-card" style={{ textAlign: 'left', width: '100%', maxWidth: '100%', marginTop: 10 }}>
            <h3 className="login-title" style={{ fontSize: 14, marginBottom: 8 }}>Internal Playlist ({playlist.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {playlist.map((track, idx) => (
                <div
                  key={`playlist-${track.title}-${idx}`}
                  className="login-status"
                  style={{
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    fontWeight: idx === playlistIndex ? 'bold' : 'normal',
                    color: idx === playlistIndex ? '#4ade80' : undefined
                  }}
                >
                  {idx === playlistIndex ? '▶ ' : ''}{idx + 1}. {track.title}
                  {track.artist ? ` — ${track.artist}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* YTM Shelf Data */}
        {displayPlaylists.map((pl, shelfIndex) => (
          <div key={`${pl.title}-${shelfIndex}`} className="login-card" style={{ textAlign: 'left', width: '100%', maxWidth: '100%', marginTop: 10 }}>
            <h3 className="login-title" style={{ fontSize: 14, marginBottom: 8 }}>{pl.title} ({pl.tracks.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pl.tracks.map((track, trackIndex) => (
                <div key={`${pl.title}-${track.title}-${trackIndex}`} className="login-status" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {trackIndex + 1}. {track.title}
                  {track.artist ? ` — ${track.artist}` : ''}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
