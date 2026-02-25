(function () {
  var btn = document.querySelector('.next-button')
         || document.querySelector('[aria-label="Next"]')
         || document.querySelector('tp-yt-paper-icon-button.next-button')
         || document.querySelector('ytmusic-player-bar .next-button');
  if (btn) { btn.click(); return; }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'N', code: 'KeyN', shiftKey: true, bubbles: true }));
})()
