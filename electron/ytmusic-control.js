function setupYouTubeMusicControls() {
  console.log('[YTMusic Control] Initializing...')

  function findElement(selector, retries = 10) {
    return new Promise((resolve) => {
      let attempts = 0
      const interval = setInterval(() => {
        const element = document.querySelector(selector)
        if (element || attempts >= retries) {
          clearInterval(interval)
          resolve(element)
        }
        attempts++
      }, 500)
    })
  }

  async function getTrackInfo() {
    const titleEl = await findElement('.title.style-scope.ytmusic-player-bar')
    const artistEl = await findElement('.byline.style-scope.ytmusic-player-bar')
    const albumEl = await findElement('.subtitle.style-scope.ytmusic-player-bar')
    let thumbEl = await findElement('ytmusic-player-bar img.image, .thumbnail img, #song-image img, ytmusic-player-bar img')
    if (!thumbEl || !thumbEl.src) {
      const wrapper = document.querySelector('ytmusic-player-bar .image') || document.querySelector('.thumbnail.ytmusic-player-bar')
      if (wrapper) {
        thumbEl = wrapper.querySelector('img') || wrapper
      }
    }

    return {
      title: titleEl?.textContent?.trim() || 'Unknown',
      artist: artistEl?.textContent?.trim() || 'Unknown Artist',
      album: albumEl?.textContent?.trim(),
      thumbnail: thumbEl?.src
    }
  }

  async function getPlaybackState() {
    const playButton = await findElement('#play-pause-button')
    const progressBar = await findElement('#progress-bar')
    const timeInfo = await findElement('.time-info')

    const isPlaying = playButton?.getAttribute('title')?.includes('Pause') || false
    
    let currentTime = 0
    let duration = 0
    
    if (progressBar) {
      currentTime = parseFloat(progressBar.getAttribute('value') || '0')
      duration = parseFloat(progressBar.getAttribute('aria-valuemax') || '0')
    }

    return { isPlaying, currentTime, duration }
  }

  async function clickButton(selector) {
    const button = await findElement(selector, 5)
    if (button) {
      button.click()
      return true
    }
    return false
  }

  window.addEventListener('message', async (event) => {
    if (event.data.type !== 'ytmusic-command') return

    console.log('[YTMusic Control] Command received:', event.data.command)

    switch (event.data.command) {
      case 'play':
      case 'pause':
        await clickButton('#play-pause-button')
        break

      case 'next':
        await clickButton('.next-button')
        break

      case 'previous':
        await clickButton('.previous-button')
        break

      case 'dislike':
        await clickButton('ytmusic-like-button-renderer[like-status="DISLIKE"] button')
        break

      case 'like':
        await clickButton('ytmusic-like-button-renderer[like-status="LIKE"] button')
        break

      case 'seek':
        if (event.data.data && typeof event.data.data.time === 'number') {
          var video = document.querySelector('video');
          if (video) {
            video.currentTime = event.data.data.time;
          }
        }
        break

      case 'playTrack':
        if (event.data.data && event.data.data.url) {
          var targetUrl = event.data.data.url;
          var links = document.querySelectorAll('a');
          var clicked = false;
          for (var i = 0; i < links.length; i++) {
            if (links[i].href === targetUrl) {
              var container = links[i].closest('ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer');
              var playBtn = container ? container.querySelector('ytmusic-play-button-renderer') : null;
              if (playBtn) {
                playBtn.click();
              } else {
                links[i].click();
              }
              clicked = true;
              break;
            }
          }
          if (!clicked) {
            window.location.href = targetUrl;
          }
        }
        break

      case 'setVolume':
        if (event.data.data && typeof event.data.data.volume === 'number') {
          const volumeSlider = await findElement('#volume-slider')
          if (volumeSlider) {
            volumeSlider.value = event.data.data.volume
            volumeSlider.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }
        break

      case 'getTrackInfo':
        const trackInfo = await getTrackInfo()
        window.parent.postMessage({
          type: 'ytmusic-track-info',
          ...trackInfo
        }, '*')
        break
    }
  })

  setInterval(async () => {
    try {
      const trackInfo = await getTrackInfo()
      window.parent.postMessage({
        type: 'ytmusic-track-info',
        ...trackInfo
      }, '*')

      const playbackState = await getPlaybackState()
      window.parent.postMessage({
        type: 'ytmusic-playback-state',
        ...playbackState
      }, '*')

      window.parent.postMessage({
        type: 'ytmusic-connection',
        connected: true
      }, '*')
    } catch (error) {
      console.error('[YTMusic Control] Error:', error)
    }
  }, 2000)

  console.log('[YTMusic Control] Initialized')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupYouTubeMusicControls)
} else {
  setupYouTubeMusicControls()
}
