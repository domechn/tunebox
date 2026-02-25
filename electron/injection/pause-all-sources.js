(function () {
  var v = document.querySelector('video');
  if (v) {
    v.muted = true;
    try { v.pause(); } catch (_) {}
  }
})()
