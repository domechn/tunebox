(function () {
  window.__tuneboxAwaitingOurNavigation = true;
  window.__tuneboxIgnoreEndedUntil = Date.now() + 8000;
  var v = document.querySelector('video');
  if (v) {
    v.muted = true;
    try { v.pause(); } catch (_) {}
  }
  var tries = 0;
  function retryPause() {
    tries++;
    var vid = document.querySelector('video');
    if (vid) {
      vid.muted = true;
      if (!vid.paused) { try { vid.pause(); } catch (_) {} }
    }
    if (tries < 10) setTimeout(retryPause, 100);
  }
  setTimeout(retryPause, 80);
})()
