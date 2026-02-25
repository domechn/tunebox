(function () {
  var url = __URL__;
  var mySerial = __SERIAL__;
  var match = url.match(/[?&]v=([^&]+)/);
  if (!match) { window.location.href = url; return; }

  var videoId = match[1];
  var watchPath = '/watch?v=' + videoId;
  var fullUrl = 'https://music.youtube.com' + watchPath;

  // Clear flags and hold playback muted until our navigation finishes
  window.__tuneboxVideoEnded = false;
  window.__tuneboxAwaitingOurNavigation = true;
  window.__tuneboxIgnoreEndedUntil = Date.now() + 4000;

  var v = document.querySelector('video');
  if (v) { v.muted = true; v.pause(); }

  // SPA navigate
  var navigated = false;
  var app = document.querySelector('ytmusic-app');
  if (app && typeof app.navigate_ === 'function') {
    app.navigate_(watchPath);
    navigated = true;
  } else {
    var router = document.querySelector('yt-navigation-manager');
    if (router && typeof router.navigate === 'function') {
      router.navigate(watchPath);
      navigated = true;
    }
  }
  if (!navigated) {
    window.location.href = fullUrl;
    return;
  }

  window.__tuneboxPlaySerial = mySerial;

  // Poll: wait for video to be ready, then force play + unmute
  var attempts = 0;
  function ensurePlaying() {
    if (window.__tuneboxPlaySerial !== mySerial) return;
    attempts++;
    var vid = document.querySelector('video');

    if (vid && !vid.paused) {
      window.__tuneboxAwaitingOurNavigation = false;
      vid.muted = false;
      return;
    }

    if (vid) {
      if (vid.readyState >= 1) {
        window.__tuneboxAwaitingOurNavigation = false;
      }
      if (vid.readyState >= 2) {
        vid.muted = false;
        vid.play().then(function () {}).catch(function () {});
      } else if (vid.readyState >= 1) {
        vid.play().catch(function () {});
      }

      if (vid.paused && attempts % 4 === 0) {
        var playBtn = document.querySelector('#play-pause-button');
        if (playBtn) { playBtn.click(); }
      }
    }

    if (attempts >= 40) {
      window.location.href = fullUrl;
      return;
    }
    setTimeout(ensurePlaying, 200);
  }
  ensurePlaying();

  // Fallback: if still paused after navigation settles
  setTimeout(function () {
    if (window.__tuneboxPlaySerial !== mySerial) return;
    var vid = document.querySelector('video');
    if (vid && vid.paused) {
      window.__tuneboxAwaitingOurNavigation = false;
      vid.muted = false;
      vid.play().catch(function () {});
      var pb = document.querySelector('#play-pause-button');
      if (pb) { pb.click(); }
    }
  }, 2500);
})()
