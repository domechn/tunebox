# TuneBox

A vintage-styled desktop music player for YouTube Music, featuring a retro 1960s-70s aesthetic with wood grain textures, brass accents, and an amber-glow display.

## Features

- **YouTube Music Integration** - Full playback control through YouTube Music's web interface
- **Vintage UI** - Wood grain texture, brass knobs, amber screen with scanline effects
- **Playback Controls** - Play/pause, skip forward/back, dislike & skip
- **Rotary Volume Knob** - Drag-to-rotate volume control with haptic-style feedback
- **Live Track Info** - Real-time song title, artist, and album art display
- **Synced Lyrics** - Displays the current lyric line in real time
- **Progress Scrubbing** - Click or drag the progress bar to seek
- **Session Persistence** - Remembers login state and volume across restarts
- **Offline Detection** - Shows a "No Connection" screen when the network drops

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Development (Web)

```bash
npm run dev
```

Opens the app at `http://localhost:5173`. Note: actual YouTube Music playback control requires the Electron desktop build.

### Development (Electron)

```bash
# Install Electron dependencies
cd electron && npm install && cd ..

# Run in development mode
npm run electron:dev
```

### Build for Production

```bash
# Build web assets
npm run build

# Package as desktop app
# macOS
npm run package:mac

# Windows
npm run electron:build:win

# Linux
npm run electron:build:linux
```

Built installers are output to the `release/` directory.

## Controls

| Control | Action |
|---------|--------|
| **Play / Pause** | Bottom wheel button |
| **Previous Track** | Left wheel button |
| **Next Track** | Right wheel button |
| **Dislike & Skip** | Top wheel button (thumbs down) |
| **Volume** | Drag the outer brass ring to rotate |
| **Seek** | Click or drag the progress bar |
| **Sign Out** | Top-left button |
| **Quit** | Top-right power button |

## Architecture

```
├── electron/                    # Electron desktop shell
│   ├── main.js                  # Main process (window, IPC, auth capture)
│   ├── preload.js               # Preload script (context bridge)
│   └── ytmusic-control.js       # Injected script for YT Music DOM control
├── src/
│   ├── App.tsx                  # Entry point (auth flow, online/offline)
│   ├── index.css                # Vintage theme styles
│   ├── components/
│   │   ├── player/
│   │   │   └── VintageRadio.tsx # Main player UI with wheel controls
│   │   └── ui/                  # shadcn/ui component library
│   └── hooks/
│       └── use-youtube-music.ts # YouTube Music playback hook (IPC + fallback)
├── build/                       # App icons (SVG, PNG, ICO, iconset)
└── package.json
```

### How It Works

1. **Authentication** - On first launch, the user signs into YouTube Music via a dedicated Electron window. The main process intercepts API request headers (authorization + cookies) and persists them to disk.

2. **Playback** - A hidden `<webview>` loads YouTube Music. The main process injects `ytmusic-control.js` into the page, which manipulates the DOM (clicking buttons, reading track info, controlling the `<video>` element).

3. **State Sync** - The main process polls the webview every second via `executeJavaScript`, extracts player state (title, artist, thumbnail, progress, lyrics), and forwards it to the renderer over IPC.

4. **Lyrics** - TuneBox automatically clicks the "Lyrics" tab when a new track starts and reads synced lyric lines from the video's text tracks.

## Tech Stack

- **React 19** + **TypeScript** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** + **Radix UI** - Component primitives
- **Phosphor Icons** - Icon set
- **Electron** - Desktop application shell

## Design

### Color Palette

| Role | Color | OKLCH |
|------|-------|-------|
| Wood background | Deep walnut | `oklch(0.35 0.04 55)` |
| Brass accent | Metallic gold | `oklch(0.65 0.12 75)` |
| Amber glow | Warm amber | `oklch(0.70 0.15 65)` |
| Text | Cream | `oklch(0.92 0.03 75)` |

### Typography

- **Orbitron** - Geometric sans-serif for the digital display look
- **Space Mono** - Monospace for the retro-computing feel

## License

MIT
