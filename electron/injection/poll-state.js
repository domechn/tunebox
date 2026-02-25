(function () {
  try {
    var video = document.querySelector('video');
    var titleEl = document.querySelector('ytmusic-player-bar .title yt-formatted-string')
               || document.querySelector('.title.style-scope.ytmusic-player-bar');
    var artistEl = document.querySelector('ytmusic-player-bar .byline yt-formatted-string a')
                || document.querySelector('.byline.style-scope.ytmusic-player-bar a')
                || document.querySelector('.byline.style-scope.ytmusic-player-bar');
    var thumbEl = document.querySelector('ytmusic-player-bar img.image')
               || document.querySelector('.thumbnail img')
               || document.querySelector('#song-image img')
               || document.querySelector('ytmusic-player-bar img');
    if (!thumbEl || !thumbEl.src) {
      var wrapper = document.querySelector('ytmusic-player-bar .image')
                 || document.querySelector('.thumbnail.ytmusic-player-bar');
      if (wrapper) {
        thumbEl = wrapper.querySelector('img') || wrapper;
      }
    }
    var isPlaying = video ? !video.paused : false;
    var ct = 0;
    var dur = 0;
    var progressBar = document.querySelector('#progress-bar') || document.querySelector('ytmusic-player-bar tp-yt-paper-slider');
    if (progressBar) {
      ct = parseFloat(progressBar.getAttribute('value') || '0');
      dur = parseFloat(progressBar.getAttribute('aria-valuemax') || '0');
    } else if (video) {
      ct = isFinite(video.currentTime) ? video.currentTime : 0;
      dur = isFinite(video.duration) ? video.duration : 0;
    }

    var normalized = function (text) {
      return (text || '').replace(/\s+/g, '').toLowerCase();
    };

    var pickText = function (el) {
      return el ? (el.textContent || '').trim() : '';
    };

    // ── Scrape ALL homepage shelves ──
    var allPlaylists = [];
    var shelves = Array.from(document.querySelectorAll('ytmusic-shelf-renderer, ytmusic-carousel-shelf-renderer'));
    for (var k = 0; k < shelves.length; k++) {
      var shelfRoot = shelves[k];
      var shelfTitleEl = shelfRoot.querySelector('h2, .title, yt-formatted-string.title');
      var shelfTitle = pickText(shelfTitleEl) || 'Untitled Shelf';
      var shelfItems = Array.from(shelfRoot.querySelectorAll(
        'ytmusic-responsive-list-item-renderer, ytmusic-two-row-item-renderer, ytmusic-compact-station-renderer'
      ));
      var tracksInShelf = [];

      for (var m = 0; m < shelfItems.length; m++) {
        var shelfItem = shelfItems[m];
        var shelfItemTitle = pickText(shelfItem.querySelector('#title, .title, yt-formatted-string.title, a[title], a#video-title'));
        var shelfItemArtist = pickText(shelfItem.querySelector('#subtitle, .subtitle, .byline, yt-formatted-string.subtitle, .details'));
        var shelfItemLink = shelfItem.querySelector('a[href*="watch"], a[href*="playlist"], a[href*="browse"], a[href]');
        var shelfItemThumb = shelfItem.querySelector('img');

        if (!shelfItemTitle && shelfItemLink) {
          shelfItemTitle = shelfItemLink.getAttribute('title') || pickText(shelfItemLink);
        }
        if (!shelfItemTitle) continue;
        var shelfItemUrl = shelfItemLink ? shelfItemLink.href : '';
        if (shelfItemUrl && shelfItemUrl.indexOf('watch') === -1) continue;

        tracksInShelf.push({
          title: shelfItemTitle,
          artist: shelfItemArtist,
          url: shelfItemUrl,
          thumbnail: shelfItemThumb ? (shelfItemThumb.src || '') : ''
        });
      }

      // Deduplicate by URL/title
      var deduped = [];
      var seen = new Set();
      for (var n = 0; n < tracksInShelf.length; n++) {
        var trackKey = (tracksInShelf[n].url || '') + '|' + normalized(tracksInShelf[n].title || '');
        if (seen.has(trackKey)) continue;
        seen.add(trackKey);
        deduped.push(tracksInShelf[n]);
      }

      if (deduped.length > 0) {
        allPlaylists.push({ title: shelfTitle, tracks: deduped });
      }
    }

    // ── Scrape "Up Next" / autoplay queue ──
    var upNextTracks = [];
    var queueItems = Array.from(document.querySelectorAll(
      'ytmusic-player-queue-item, ' +
      'ytmusic-queue #contents ytmusic-responsive-list-item-renderer, ' +
      '#automix-contents ytmusic-responsive-list-item-renderer, ' +
      '#queue-content ytmusic-responsive-list-item-renderer, ' +
      'ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_QUEUE"] ytmusic-responsive-list-item-renderer'
    ));
    for (var qi = 0; qi < queueItems.length; qi++) {
      var qItem = queueItems[qi];
      var qTitle = pickText(qItem.querySelector('.song-title, .title, yt-formatted-string.title, a[title]'));
      var qArtist = pickText(qItem.querySelector('.byline, .subtitle, .secondary-flex-columns yt-formatted-string'));
      var qThumb = qItem.querySelector('img');
      var qUrl = '';
      var qLink = qItem.querySelector('a[href*="watch"]');
      if (qLink) {
        qUrl = qLink.href;
      } else {
        var qVideoId = qItem.getAttribute('video-id')
                    || (qItem.__data && qItem.__data.data && qItem.__data.data.videoId)
                    || '';
        if (qVideoId) qUrl = 'https://music.youtube.com/watch?v=' + qVideoId;
      }
      if (!qTitle || !qUrl) continue;
      upNextTracks.push({
        title: qTitle,
        artist: qArtist,
        url: qUrl,
        thumbnail: qThumb ? (qThumb.src || '') : ''
      });
    }
    if (upNextTracks.length > 0) {
      var unSeen = new Set();
      upNextTracks = upNextTracks.filter(function (t) {
        var key = (t.url || '') + '|' + normalized(t.title || '');
        if (unSeen.has(key)) return false;
        unSeen.add(key);
        return true;
      });
    }

    var recommendedTracks = allPlaylists.length > 0 ? allPlaylists[0].tracks : [];

    var videoEnded = !!(window.__tuneboxVideoEnded);
    if (videoEnded) window.__tuneboxVideoEnded = false;

    return {
      title:     titleEl  ? titleEl.textContent.trim()  : '',
      artist:    artistEl ? artistEl.textContent.trim() : '',
      thumbnail: thumbEl ? (thumbEl.src || '') : '',
      isPlaying: isPlaying,
      currentTime: ct,
      duration: dur,
      videoEnded: videoEnded,
      recommendedTracks: recommendedTracks,
      allPlaylists: allPlaylists,
      upNextTracks: upNextTracks
    };
  } catch (e) { return null; }
})()
