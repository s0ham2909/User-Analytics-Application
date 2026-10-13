const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true },
    type: { type: String, required: true, enum: ['page_view', 'click'] },
    url: { type: String, required: true },
    path: { type: String, required: true },
    timestamp: { type: Date, required: true }, // client time (trusted, see README)
    x: { type: Number }, // click only: pageX
    y: { type: Number }, // click only: pageY
    viewport: {
      w: { type: Number },
      h: { type: Number },
    },
    created_at: { type: Date, default: Date.now }, // server time (backup)
  },
  { versionKey: false }
);

// Query patterns: journey per session, heatmap per page
eventSchema.index({ session_id: 1, timestamp: 1 });
eventSchema.index({ type: 1, path: 1 });

module.exports = mongoose.model('Event', eventSchema);
