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
		lyrics: string; currentLyric: string
	}) => void) => (() => void) | void
	sendCommand: (command: string, data?: any) => Promise<{ ok: boolean; error?: string }>
	logout: () => Promise<{ ok: boolean }>
	quit: () => Promise<void>
}

interface Window {
	electron?: ElectronApi
}

declare namespace JSX {
	interface IntrinsicElements {
		webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
			src?: string
			partition?: string
			allowpopups?: string
			webpreferences?: string
		}
	}
}