(function () {
  try {
    var pickText = function (el) { return el ? (el.textContent || '').trim() : ''; };
    var normalized = function (text) { return (text || '').replace(/\s+/g, '').toLowerCase(); };
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
        var item = shelfItems[m];
        var iTitle = pickText(item.querySelector('#title, .title, yt-formatted-string.title, a[title], a#video-title'));
        var iArtist = pickText(item.querySelector('#subtitle, .subtitle, .byline, yt-formatted-string.subtitle, .details'));
        var iLink = item.querySelector('a[href*="watch"]');
        var iThumb = item.querySelector('img');
        if (!iTitle) continue;
        var iUrl = iLink ? iLink.href : '';
        if (iUrl && iUrl.indexOf('watch') === -1) continue;
        tracksInShelf.push({ title: iTitle, artist: iArtist, url: iUrl, thumbnail: iThumb ? (iThumb.src || '') : '' });
      }
      if (tracksInShelf.length > 0) allPlaylists.push({ title: shelfTitle, tracks: tracksInShelf });
    }
    return { allPlaylists: allPlaylists };
  } catch (e) { return null; }
})()
