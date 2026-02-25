(function () {
  var btn = document.querySelector('.previous-button')
         || document.querySelector('[aria-label="Previous"]')
         || document.querySelector('tp-yt-paper-icon-button.previous-button')
         || document.querySelector('ytmusic-player-bar .previous-button');
  if (btn) { btn.click(); return; }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'P', code: 'KeyP', shiftKey: true, bubbles: true }));
})()
