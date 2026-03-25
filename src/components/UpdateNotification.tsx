import { useEffect, useState, useCallback } from 'react'
import { ArrowsClockwise, DownloadSimple, ArrowCounterClockwise } from '@phosphor-icons/react'

type UpdateStatus = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const electron = window.electron
    if (!electron?.onUpdateAvailable) return

    const unsubs: Array<(() => void) | void> = []

    unsubs.push(electron.onUpdateAvailable((info) => {
      setVersion(info.version)
      setStatus('available')
      setDismissed(false)
    }))

    unsubs.push(electron.onDownloadProgress((p) => {
      setProgress(Math.round(p.percent))
    }))

    unsubs.push(electron.onUpdateDownloaded(() => {
      setStatus('downloaded')
    }))

    unsubs.push(electron.onUpdateError(() => {
      setStatus('error')
    }))

    return () => {
      unsubs.forEach((fn) => fn?.())
    }
  }, [])

  const handleDownload = useCallback(() => {
    setStatus('downloading')
    setProgress(0)
    window.electron?.downloadUpdate()
  }, [])

  const handleInstall = useCallback(() => {
    window.electron?.installUpdate()
  }, [])

  if (dismissed || status === 'idle') return null

  return (
    <div className="update-banner">
      {status === 'available' && (
        <>
          <span className="update-banner-text">v{version} 可用</span>
          <button className="update-banner-btn" onClick={handleDownload}>
            <DownloadSimple size={14} weight="bold" />
            更新
          </button>
          <button className="update-banner-dismiss" onClick={() => setDismissed(true)}>
            ✕
          </button>
        </>
      )}

      {status === 'downloading' && (
        <>
          <span className="update-banner-text">下载中 {progress}%</span>
          <div className="update-banner-progress">
            <div className="update-banner-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {status === 'downloaded' && (
        <>
          <span className="update-banner-text">更新就绪</span>
          <button className="update-banner-btn" onClick={handleInstall}>
            <ArrowCounterClockwise size={14} weight="bold" />
            重启
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <span className="update-banner-text">更新失败</span>
          <button className="update-banner-btn" onClick={() => { setStatus('idle'); window.electron?.checkForUpdates() }}>
            <ArrowsClockwise size={14} weight="bold" />
            重试
          </button>
          <button className="update-banner-dismiss" onClick={() => setDismissed(true)}>
            ✕
          </button>
        </>
      )}
    </div>
  )
}
