(function () {
  var vol = __VOLUME__;
  window.__tuneboxDesiredVolume = vol;
  var v = document.querySelector('video');
  if (v) {
    window.__tuneboxSelfSetting = true;
    try { v.volume = vol; } finally { window.__tuneboxSelfSetting = false; }
  }
})()
