const router = require('express').Router();
const Event = require('../models/Event');

// GET /api/sessions -> one row per session, derived by aggregation
router.get('/sessions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const rows = await Event.aggregate([
      {
        $group: {
          _id: '$session_id',
          event_count: { $sum: 1 },
          page_view_count: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
          click_count: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } },
          first_seen: { $min: '$timestamp' },
          last_seen: { $max: '$timestamp' },
          paths: { $addToSet: '$path' },
        },
      },
      { $sort: { last_seen: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          session_id: '$_id',
          event_count: 1,
          page_view_count: 1,
          click_count: 1,
          pages_visited: { $size: '$paths' },
          first_seen: 1,
          last_seen: 1,
        },
      },
    ]);
    res.json(rows);
  } catch (err) {
    console.error('[sessions]', err.message);
    res.status(500).json({ error: 'failed to list sessions' });
  }
});

// GET /api/sessions/:id/events -> full ordered journey
router.get('/sessions/:id/events', async (req, res) => {
  try {
    const events = await Event.find({ session_id: req.params.id })
      .sort({ timestamp: 1, created_at: 1 })
      .lean();
    res.json(events);
  } catch (err) {
    console.error('[session events]', err.message);
    res.status(500).json({ error: 'failed to fetch session events' });
  }
});

// GET /api/pages -> distinct paths with counts (feeds the heatmap dropdown)
router.get('/pages', async (req, res) => {
  try {
    const rows = await Event.aggregate([
      {
        $group: {
          _id: '$path',
          event_count: { $sum: 1 },
          click_count: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } },
        },
      },
      { $sort: { event_count: -1 } },
      { $project: { _id: 0, path: '$_id', event_count: 1, click_count: 1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error('[pages]', err.message);
    res.status(500).json({ error: 'failed to list pages' });
  }
});

// GET /api/heatmap?path=/products.html -> click coordinates for one page
router.get('/heatmap', async (req, res) => {
  try {
    const q = req.query.path;
    const path = Array.isArray(q) ? q[0] : q;
    if (!path) return res.status(400).json({ error: 'path query parameter is required' });
    const clicks = await Event.find({ type: 'click', path })
      .select('x y viewport timestamp -_id')
      .lean();
    res.json(clicks);
  } catch (err) {
    console.error('[heatmap]', err.message);
    res.status(500).json({ error: 'failed to fetch heatmap data' });
  }
});

module.exports = router;
