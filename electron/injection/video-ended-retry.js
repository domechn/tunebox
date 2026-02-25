(function () {
  try {
    window.__tuneboxAwaitingOurNavigation = true;
    window.__tuneboxIgnoreEndedUntil = Date.now() + 5000;
    var v = document.querySelector('video');
    if (!v) return;
    v.muted = true;
    try { v.pause(); } catch (_) {}
    var tries = 0;
    function retryPause() {
      tries++;
      v.muted = true;
      if (!v.paused) {
        try { v.pause(); } catch (_) {}
      }
      if (tries < 8) {
        setTimeout(retryPause, 120);
      }
    }
    setTimeout(retryPause, 120);
  } catch (_) {}
})()
