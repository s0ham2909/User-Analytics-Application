import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJSON } from '../api.js';
import { fmt } from '../time.js';

export default function SessionDetail() {
  const { id } = useParams();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getJSON(`/api/sessions/${encodeURIComponent(id)}/events`)
      .then(setEvents)
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <section>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" className="btn-back">
          ← Back to sessions
        </Link>
      </div>

      <div className="session-header">
        <h2>
          User Journey for Session: <span className="mono session-id-badge">{id}</span>
        </h2>
        {events && events.length > 0 && (
          <p className="muted">
            {events.length} events recorded · Started {fmt(events[0].timestamp)} · Last active {fmt(events[events.length - 1].timestamp)}
          </p>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {!events && !error && <p>Loading events…</p>}
      {events && events.length === 0 && (
        <p className="muted">No events recorded for this session.</p>
      )}

      {events && events.length > 0 && (
        <div className="table-responsive">
          <table className="journey-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th style={{ width: 110 }}>Type</th>
                <th>Page URL</th>
                <th style={{ width: 220 }}>Timestamp (Full Date/Time)</th>
                <th style={{ width: 160 }}>Coordinates (X, Y)</th>
                <th style={{ width: 130 }}>Viewport</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, idx) => (
                <tr key={ev._id || idx} className={`event-row ${ev.type}`}>
                  <td className="muted mono">{idx + 1}</td>
                  <td>
                    <span className={`badge badge-${ev.type}`}>{ev.type}</span>
                  </td>
                  <td>
                    <div className="url mono">
                      <a href={ev.url} target="_blank" rel="noreferrer" title={ev.url}>
                        {ev.url}
                      </a>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 13 }}>
                    {fmt(ev.timestamp)}
                  </td>
                  <td className="mono">
                    {ev.type === 'click' && Number.isFinite(ev.x) && Number.isFinite(ev.y) ? (
                      <span className="coord-badge">
                        x: {ev.x}, y: {ev.y}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono muted">
                    {ev.viewport?.w && ev.viewport?.h ? (
                      `${ev.viewport.w} × ${ev.viewport.h}`
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
