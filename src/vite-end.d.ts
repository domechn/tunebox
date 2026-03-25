/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

interface ElectronApi {
	version: string
	openYouTubeMusicLogin: () => Promise<{ opened: boolean }>
	getYouTubeMusicAuthState: () => Promise<{ ready: boolean; capturedAt: string | null }>
	getYouTubeMusicAuthHeaders: () => Promise<Record<string, string> | null>
	onYouTubeMusicAuthUpdated: (callback: (payload: { ready: boolean; capturedAt: string | null }) => void) => (() => void) | void
	onYouTubeMusicState: (callback: (state: {
		title: string; artist: string; thumbnail: string
		isPlaying: boolean; currentTime: number; duration: number
		videoEnded: boolean
		lyrics: string; currentLyric: string
		recommendedTracks?: Array<{ title: string; artist?: string; url?: string; thumbnail?: string }>
		allPlaylists?: Array<{ title: string; tracks: Array<{ title: string; artist?: string; url?: string; thumbnail?: string }> }>
	}) => void) => (() => void) | void
	sendCommand: (command: string, data?: any) => Promise<{ ok: boolean; error?: string }>
	logout: () => Promise<{ ok: boolean }>
	quit: () => Promise<void>

	// Auto-updater
	checkForUpdates: () => Promise<{ ok: boolean; version?: string; error?: string }>
	downloadUpdate: () => Promise<{ ok: boolean; error?: string }>
	installUpdate: () => Promise<void>
	onUpdateAvailable: (callback: (info: { version: string; releaseDate?: string; releaseNotes?: string }) => void) => (() => void) | void
	onUpdateDownloaded: (callback: (info: { version: string }) => void) => (() => void) | void
	onDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => (() => void) | void
	onUpdateError: (callback: (error: { message: string }) => void) => (() => void) | void
}

interface Window {
	electron?: ElectronApi
}

declare namespace JSX {
	interface IntrinsicElements {
		webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
			src?: string
			partition?: string
			allowpopups?: boolean
			webpreferences?: string
		}
	}
}