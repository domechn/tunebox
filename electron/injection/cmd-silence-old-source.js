(function () {
  window.__tuneboxPlaySerial = -1;
  window.__tuneboxAwaitingOurNavigation = false;
  var v = document.querySelector('video');
  if (v) { v.muted = true; v.pause(); }
})()
