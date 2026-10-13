const router = require('express').Router();
const Event = require('../models/Event');

const TYPES = new Set(['page_view', 'click']);
const MAX_COORD = 100000;
const MAX_STR = 2048;

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

function pathFromUrl(u) {
  try {
    return new URL(u).pathname || '/';
  } catch {
    return '/';
  }
}

function cleanPath(p, u) {
  if (p && typeof p === 'string') {
    try {
      return new URL(p, 'http://localhost').pathname || '/';
    } catch {
      return p.split('?')[0].split('#')[0] || '/';
    }
  }
  return pathFromUrl(u);
}

function cleanStr(v, max = MAX_STR) {
  return typeof v === 'string' ? v.slice(0, max) : undefined;
}

/**
 * POST /api/events
 * Body: { session_id, type, url, path?, timestamp, x?, y?, viewport? }
 */
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const session_id = cleanStr(b.session_id, 128);
    const url = cleanStr(b.url);

    if (!session_id) return res.status(400).json({ error: 'session_id is required' });
    if (!TYPES.has(b.type)) return res.status(400).json({ error: 'type must be "page_view" or "click"' });
    if (!url) return res.status(400).json({ error: 'url is required' });

    // Client timestamp: accept ISO string or epoch ms; fall back to server time if bogus/future
    let timestamp = new Date(b.timestamp);
    if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() > Date.now() + 5 * 60 * 1000) {
      timestamp = new Date();
    }

    const doc = {
      session_id,
      type: b.type,
      url,
      path: cleanPath(b.path, url),
      timestamp,
      created_at: new Date(),
    };

    if (b.type === 'click') {
      doc.x = clampInt(b.x, 0, MAX_COORD);
      doc.y = clampInt(b.y, 0, MAX_COORD);
      doc.viewport = {
        w: clampInt(b.viewport && b.viewport.w, 0, MAX_COORD),
        h: clampInt(b.viewport && b.viewport.h, 0, MAX_COORD),
      };
    }

    const created = await Event.create(doc);
    res.status(201).json({ id: created._id });
  } catch (err) {
    console.error('[events]', err.message);
    res.status(500).json({ error: 'failed to store event' });
  }
});

module.exports = router;
