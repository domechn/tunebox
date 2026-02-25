(function () {
  var btn = document.querySelector('#dislike-button-renderer button')
         || document.querySelector('ytmusic-like-button-renderer#like-button-renderer [aria-label*="dislike" i]')
         || document.querySelector('[aria-label="Dislike"]')
         || document.querySelector('ytmusic-like-button-renderer[like-status] .dislike');
  if (btn) btn.click();
})()
