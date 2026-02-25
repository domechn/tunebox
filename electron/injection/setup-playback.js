(function () {
  var seedVol = __SEED_VOLUME__;
  if (typeof window.__tuneboxDesiredVolume === 'undefined' || window.__tuneboxDesiredVolume === null) {
    window.__tuneboxDesiredVolume = seedVol;
  }
  if (typeof window.__tuneboxSelfSetting === 'undefined') {
    window.__tuneboxSelfSetting = false;
  }
  var origDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
  if (origDescriptor && !HTMLMediaElement.prototype.__tuneboxIntercepted) {
    HTMLMediaElement.prototype.__tuneboxIntercepted = true;
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      get: origDescriptor.get,
      set: function (v) {
        if (!window.__tuneboxSelfSetting && window.__tuneboxDesiredVolume !== null) {
          origDescriptor.set.call(this, window.__tuneboxDesiredVolume);
        } else {
          origDescriptor.set.call(this, v);
        }
      },
      configurable: true
    });
  }
  function enforceVolume(video) {
    if (window.__tuneboxDesiredVolume === null) return;
    window.__tuneboxSelfSetting = true;
    try { video.volume = window.__tuneboxDesiredVolume; } finally { window.__tuneboxSelfSetting = false; }
  }
  if (typeof window.__tuneboxAwaitingOurNavigation === 'undefined') {
    window.__tuneboxAwaitingOurNavigation = false;
  }
  if (typeof window.__tuneboxIgnoreEndedUntil === 'undefined') {
    window.__tuneboxIgnoreEndedUntil = 0;
  }
  function setupVideoListeners() {
    var video = document.querySelector('video');
    if (!video) return;
    if (window.__tuneboxAwaitingOurNavigation) {
      video.muted = true;
      try { video.pause(); } catch (e) {}
    }
    if (video.__tuneboxListenersSet) return;
    video.__tuneboxListenersSet = true;
    video.addEventListener('ended', function () {
      if (Date.now() < (window.__tuneboxIgnoreEndedUntil || 0)) {
        return;
      }
      video.muted = true;
      video.pause();
      window.__tuneboxVideoEnded = true;
      window.__tuneboxAwaitingOurNavigation = true;
      console.log('__TUNEBOX_VIDEO_ENDED__');
    });
    video.addEventListener('play', function () {
      if (window.__tuneboxAwaitingOurNavigation) {
        video.muted = true;
        try { video.pause(); } catch (e) {}
        return;
      }
      window.__tuneboxVideoEnded = false;
      video.muted = false;
      enforceVolume(video);
    });
    video.addEventListener('loadstart', function () {
      if (window.__tuneboxAwaitingOurNavigation) {
        video.muted = true;
      }
    });
    video.addEventListener('loadeddata', function () {
      if (window.__tuneboxAwaitingOurNavigation) {
        video.muted = true;
        try { video.pause(); } catch (e) {}
        return;
      }
      enforceVolume(video);
    });
    video.addEventListener('canplay', function () {
      if (window.__tuneboxAwaitingOurNavigation) {
        video.muted = true;
        try { video.pause(); } catch (e) {}
        return;
      }
      enforceVolume(video);
    });
    video.addEventListener('volumechange', function () {
      if (!window.__tuneboxSelfSetting && window.__tuneboxDesiredVolume !== null && !window.__tuneboxAwaitingOurNavigation) {
        enforceVolume(video);
      }
    });
    enforceVolume(video);
  }
  setupVideoListeners();
  if (!window.__tuneboxSetupInterval) {
    window.__tuneboxSetupInterval = setInterval(setupVideoListeners, 2000);
  }
})()
