(function () {
  var v = document.querySelector('video');
  if (v && v.readyState >= 3) {
    v.pause();
    return true;
  }
  return false;
})()
