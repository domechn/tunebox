# TuneBox

A retro-styled desktop player for **YouTube Music** — wood grain, brass knobs and an amber glow display, in a compact 1960s–70s radio.

[**Download the latest release**](https://github.com/domechn/tunebox/releases/latest) · macOS (Apple Silicon / Intel) · Windows (installer / portable) · Linux (AppImage / deb / rpm)

<p>
  <img width="372" alt="TuneBox player" src="https://github.com/user-attachments/assets/4de225f4-1136-41a0-923a-b717f5c37de6" />
  <img width="372" alt="TuneBox playlists" src="https://github.com/user-attachments/assets/4407016f-f131-4829-93a1-cef120bc7539" />
</p>

## Features

- **Real YouTube Music playback** – sign in with your own account; your recommendations show up in the app
- **Vintage UI** – wood grain, brass wheel buttons, amber screen with scanlines
- **Playback controls** – play/pause, previous/next, dislike & skip, drag-to-seek progress bar
- **Rotary volume knob** – drag the brass ring to turn the volume
- **Live track info and synced lyrics** – title, artist, cover art and the current lyric line
- **Fast track changes** – the next song is preloaded in a hidden window and swapped in when the current one ends
- **Remembers you** – login state and volume persist across restarts
- **Offline screen** – a "No Connection" display when the network drops
- **Auto update** – checks GitHub Releases and lets you download and install new versions

## Install

Grab the installer for your platform from the [Releases](https://github.com/domechn/tunebox/releases/latest) page.

> The macOS build is not code-signed. If Gatekeeper blocks it, right-click the app and choose **Open**. Auto update on macOS may not work for unsigned builds — download new versions manually if it fails.

## Controls

| Control | Action |
|---------|--------|
| Bottom wheel button | Play / pause |
| Left / right wheel button | Previous / next track |
| Top wheel button (thumbs down) | Dislike & skip |
| Outer brass ring | Drag to change volume |
| Progress bar | Click or drag to seek |
| Top-left button | Sign out |
| Top-right power button | Quit |

## Privacy

TuneBox signs in through the official YouTube Music web page inside an Electron window. Your session cookies stay in Electron's local profile on your machine and are only sent to Google/YouTube. Signing out clears that profile. TuneBox is an unofficial client and is not affiliated with Google or YouTube.

## Development

Requirements: [Node.js](https://nodejs.org/) >= 20.

```bash
npm install
cd electron && npm install && cd ..

# 1) renderer dev server (http://localhost:5173)
npm run dev

# 2) in another terminal: the Electron shell, loading the dev server
cd electron && npm start
```

Playback control only works inside Electron; the plain web dev server shows the UI without a player.

```bash
npm run lint                 # ESLint
npx tsc -b --noEmit          # type check
npm run build                # build the renderer into dist/

# Package installers (output: electron/dist/)
npm run package:mac          # from the repo root (builds icons + renderer first)
cd electron && npm run package:win
cd electron && npm run package:linux
```

Releases are built by GitHub Actions when a `v*` tag is pushed. Bump the version in **both** `package.json` and `electron/package.json` first.

## How it works

```
electron/
  main.js          main process: windows, YouTube session, IPC, track preloading
  preload.js       context bridge exposed to the renderer as window.electron
  updater.js       auto update via electron-updater (GitHub Releases)
  scripts.js       loads and parameterises the scripts in injection/
  injection/       small scripts run inside the YouTube Music page
                   (play, seek, volume, state polling, preload probing, ...)
src/
  App.tsx                        login flow, online/offline handling
  hooks/use-youtube-music.ts     player state, queue logic, IPC commands
  components/player/             radio UI, wheel controls, mini player
```

1. **Login** – a separate Electron window opens `music.youtube.com`; once the session is established the main window starts.
2. **Playback** – a `<webview>` hosts YouTube Music. UI commands go over IPC to the main process, which runs the matching injection script in the page.
3. **State sync** – the main process polls the page once a second and forwards title, artist, cover, progress, lyrics and recommendations to the renderer.
4. **Preloading** – near the end of a track the next one loads in a hidden window and is swapped in for near-instant playback.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui + Radix UI, Electron, electron-updater.

## License

MIT
