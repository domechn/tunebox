(function () {
  var vol = __VOLUME__;
  window.__tuneboxAwaitingOurNavigation = false;
  window.__tuneboxDesiredVolume = vol;
  window.__tuneboxSelfSetting = true;
  var v = document.querySelector('video');
  try {
    if (v) { v.volume = vol; }
  } finally { window.__tuneboxSelfSetting = false; }
  if (v) {
    v.muted = false;
    v.play().catch(function () {});
  }
  // Also click YT Music play button to sync internal state
  var playBtn = document.querySelector('#play-pause-button');
  if (playBtn && v && v.paused) {
    playBtn.click();
  }
  // Aggressive retry
  var retries = 0;
  function retryPlay() {
    retries++;
    var vid = document.querySelector('video');
    if (vid && !vid.paused && vid.currentTime > 0) { return; }
    if (vid) {
      vid.muted = false;
      vid.play().catch(function () {});
      if (vid.paused) {
        var pb = document.querySelector('#play-pause-button');
        if (pb) { pb.click(); }
      }
    }
    if (retries < 15) { setTimeout(retryPlay, 200); }
  }
  setTimeout(retryPlay, 200);
})()
