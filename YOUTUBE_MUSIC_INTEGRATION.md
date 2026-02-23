# YouTube Music Integration Guide

## Current Implementation

This Vintage Radio app provides a retro-style interface for controlling YouTube Music. Due to browser security restrictions (CORS and iframe sandboxing), direct JavaScript-based YouTube Music API integration from a web app is not possible.

## Integration Approaches

### 1. Electron Desktop App (Recommended for Full Features)
The Electron version can inject custom JavaScript into the YouTube Music page to:
- Control playback (play/pause, next/previous)
- Extract track information (title, artist, album art)
- Get lyrics
- Trigger dislike/like actions
- Control volume

**Implementation**: The `/electron` directory contains the Electron wrapper that enables these features.

### 2. Browser Extension
Create a browser extension that:
- Injects a content script into music.youtube.com
- Communicates with the radio interface via message passing
- Controls the YouTube Music player directly

### 3. Current Web App Limitations
The web-based version can:
- Embed YouTube Music in an iframe for login/authentication
- Provide a UI for controls
- **Cannot** directly control YouTube Music player due to cross-origin restrictions

## Files Structure

- `/src/hooks/use-youtube-music.ts` - YouTube Music control hook (ready for integration)
- `/src/components/player/VintageRadio.tsx` - Main radio interface
- `/src/components/player/TrackDisplay.tsx` - Track info and lyrics display
- `/electron` - Desktop app integration (see DESKTOP_APP_GUIDE.md)

## Message Format for Integration

When integrated with Electron or a browser extension, use these message types:

### Commands (App → YouTube Music)
```javascript
{
  type: 'ytmusic-command',
  command: 'play' | 'pause' | 'next' | 'previous' | 'dislike' | 'setVolume',
  data?: { volume: number } // for setVolume command
}
```

### Events (YouTube Music → App)
```javascript
// Track information
{
  type: 'ytmusic-track-info',
  title: string,
  artist: string,
  album?: string,
  thumbnail?: string,
  duration?: number
}

// Playback state
{
  type: 'ytmusic-playback-state',
  isPlaying: boolean,
  currentTime: number,
  duration: number
}

// Lyrics
{
  type: 'ytmusic-lyrics',
  lyrics: string // newline-separated lyrics
}

// Connection status
{
  type: 'ytmusic-connection',
  connected: boolean
}
```

## Running as Desktop App

See `DESKTOP_APP_GUIDE.md` for instructions on building and running the full-featured Electron desktop application.
