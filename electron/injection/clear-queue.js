(function () {
  function clearYTMusicQueue() {
    // Method 1: Polymer player queue API
    try {
      var playerBar = document.querySelector('ytmusic-player-bar');
      if (playerBar) {
        var queue = playerBar.queue;
        if (queue) {
          if (typeof queue.clearQueueAsync_ === 'function') {
            queue.clearQueueAsync_({});
            console.log('[TuneBox] Queue cleared via clearQueueAsync_');
            return;
          }
          if (typeof queue.clearQueue === 'function') {
            queue.clearQueue();
            console.log('[TuneBox] Queue cleared via clearQueue()');
            return;
          }
          if (Array.isArray(queue.items_)) {
            queue.items_ = [];
            queue.notifyPath && queue.notifyPath('items_');
            console.log('[TuneBox] Queue cleared by emptying items_');
            return;
          }
        }
      }
    } catch (e) {}

    // Method 2: YT Music app-level navigate to home (resets queue)
    try {
      var app = document.querySelector('ytmusic-app');
      if (app && typeof app.navigate_ === 'function') {
        app.navigate_({ endpoint: { browseEndpoint: { browseId: 'FEmusic_home' } } });
        console.log('[TuneBox] Queue cleared via ytmusic-app navigate to home');
        return;
      }
    } catch (e) {}

    // Method 3: Open queue panel and click "Clear queue" button
    try {
      var queueBtn = document.querySelector('#queue-button button') ||
                     document.querySelector('ytmusic-player-bar tp-yt-paper-icon-button.queue-button') ||
                     document.querySelector('ytmusic-player-bar [aria-label*="Queue"], ytmusic-player-bar [aria-label*="queue"]');
      if (queueBtn) {
        var panel = document.querySelector('ytmusic-player-queue-panel[opened]') ||
                   document.querySelector('#queue[opened]');
        if (!panel) {
          queueBtn.click();
          setTimeout(function () { clickClearQueueButton(); }, 600);
        } else {
          clickClearQueueButton();
        }
      }
    } catch (e) {}
  }

  function clickClearQueueButton() {
    try {
      var moreBtn = document.querySelector(
        'ytmusic-player-queue-panel #more-button button, ' +
        'ytmusic-player-queue-panel .header-more-button button, ' +
        '#queue tp-yt-paper-icon-button[aria-label*="More"], ' +
        '#queue tp-yt-paper-icon-button[aria-label*="more"]'
      );
      if (moreBtn) {
        moreBtn.click();
        setTimeout(function () {
          var items = Array.from(document.querySelectorAll(
            'ytmusic-menu-service-item-renderer, tp-yt-paper-item'
          ));
          var clearItem = items.find(function (el) {
            var txt = (el.textContent || '').toLowerCase();
            return txt.indexOf('clear queue') !== -1 || txt.indexOf('清空队列') !== -1;
          });
          if (clearItem) {
            clearItem.click();
            console.log('[TuneBox] Queue cleared via Clear Queue button');
          }
        }, 400);
      }
    } catch (e) {}
  }

  // Run after YT Music finishes initializing
  setTimeout(clearYTMusicQueue, 2500);
})()
