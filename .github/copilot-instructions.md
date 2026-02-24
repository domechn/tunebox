# Project Guidelines

## Code Style
- **React & TypeScript**: Use React 19 with TypeScript. Use functional components and hooks.
- **Styling**: Use Tailwind CSS v4 and custom CSS in `src/index.css`. UI components are based on shadcn/ui (`src/components/ui/`).
- **Icons**: Use Phosphor Icons (`@phosphor-icons/react`).

## Architecture
- **Frontend**: React application located in `src/`. The main entry point is `src/main.tsx` and `src/App.tsx`.
- **Backend**: Electron application located in `electron/`. The main entry point is `electron/main.js`.
- **Communication**: The React frontend communicates with the Electron backend via IPC (`window.electron.sendCommand`) exposed in `electron/preload.js`.
- **YouTube Music Integration**: The app embeds YouTube Music using a `<webview>` or `<iframe>` and injects `electron/ytmusic-control.js` to control playback and extract track info. The `useYouTubeMusic` hook (`src/hooks/use-youtube-music.ts`) manages this interaction.

## Build and Test
- **Install Dependencies**: 
  ```bash
  npm install
  cd electron && npm install
  ```
- **Development**: 
  Terminal 1: `npm run dev` (starts Vite dev server)
  Terminal 2: `cd electron && ELECTRON_START_URL=http://localhost:5173 npm start` (starts Electron app)
- **Build**: 
  ```bash
  npm run build
  cd electron && npm run package:mac # or package:win, package:linux, package:all
  ```

## Project Conventions
- **State Management**: Use React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) and custom hooks like `useLocalStorage` (`src/hooks/use-local-storage.ts`).
- **UI Components**: Prefer using existing shadcn/ui components in `src/components/ui/` before creating new ones.
- **Player Components**: Player-specific components are located in `src/components/player/` (e.g., `VintageRadio.tsx`, `TrackDisplay.tsx`).

## Integration Points
- **YouTube Music API**: The app interacts with YouTube Music by injecting scripts (`electron/ytmusic-control.js`) into the embedded page. Commands are sent via IPC or `postMessage`.
- **Authentication**: The Electron app intercepts network requests to capture YouTube Music authentication headers (`electron/main.js`).

## Security
- **Context Isolation**: Electron uses `contextIsolation: true` and `nodeIntegration: false` for security. The `preload.js` script exposes a safe API to the renderer process via `contextBridge`.
- **Authentication Headers**: Captured authentication headers are stored locally in `ytmusic-auth.json` in the user data directory.