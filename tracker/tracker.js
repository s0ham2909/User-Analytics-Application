/**
 * Minimal event tracker — drop into any page:
 *   <script src="/tracker.js" data-api="http://localhost:4000"></script>
 * data-api is optional; when empty/omitted, events post to the same origin.
 * Tracks: page_view (on load) and click (document-level, with page x/y and viewport).
 * Skips tracking when loaded inside an iframe (e.g. dashboard heatmap preview)
 * or when the URL contains notrack=1.
 */
(function () {
  // 1. Skip if rendered inside an iframe or notrack parameter is present
  try {
    if (window.self !== window.top) return;
  } catch (e) {
    return; // cross-origin frame access throws -> definitely inside iframe
  }

  try {
    var search = (window.location && window.location.search) || '';
    var hash = (window.location && window.location.hash) || '';
    if (search.indexOf('notrack') !== -1 || hash.indexOf('notrack') !== -1) {
      return;
    }
  } catch (e) {}

  var script = document.currentScript || document.querySelector('script[src*="tracker.js"]');
  var API = (script && script.getAttribute('data-api')) || '';
  var SESSION_KEY = 'analytics_session_id';
  var SESSION_TTL = 30 * 60 * 1000; // new session after 30 min of inactivity

  function getSessionId() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && saved.id && Date.now() - saved.t < SESSION_TTL) {
          localStorage.setItem(SESSION_KEY, JSON.stringify({ id: saved.id, t: Date.now() }));
          return saved.id;
        }
      }
      var id =
        window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : 's-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: id, t: Date.now() }));
      return id;
    } catch (e) {
      return 'anon-' + Math.random().toString(36).slice(2); // storage blocked
    }
  }

  function getNormalizedPath() {
    try {
      return window.location.pathname || '/';
    } catch (e) {
      return '/';
    }
  }

  function send(event) {
    var payload = JSON.stringify(event);
    var sent = false;
    try {
      if (window.fetch) {
        fetch(API + '/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true, // survives page navigation (e.g. click that navigates away)
        }).catch(function () {});
        sent = true;
      }
    } catch (e) {}

    if (!sent) {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(API + '/api/events', new Blob([payload], { type: 'application/json' }));
        }
      } catch (e2) {}
    }
  }

  var session_id = getSessionId();

  function track(type, extra) {
    var event = {
      session_id: session_id,
      type: type,
      url: window.location.href,
      path: getNormalizedPath(),
      timestamp: new Date().toISOString(),
    };
    if (extra) {
      for (var k in extra) {
        event[k] = extra[k];
      }
    }
    send(event);
  }

  // 1. Record page view on load
  track('page_view');

  // 2. Record clicks on document with pageX/pageY and viewport
  document.addEventListener(
    'click',
    function (e) {
      track('click', {
        x: Math.round(e.pageX),
        y: Math.round(e.pageY),
        viewport: { w: window.innerWidth, h: window.innerHeight },
      });
    },
    { passive: true }
  );
})();
