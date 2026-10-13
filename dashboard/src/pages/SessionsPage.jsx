import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJSON } from '../api.js';
import { timeAgo, fmt, shortId } from '../time.js';

export default function SessionsPage() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');
  const nav = useNavigate();

  async function load() {
    try {
      setSessions(await getJSON('/api/sessions'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <div className="row">
        <h2>Sessions</h2>
        <button onClick={load}>Refresh</button>
      </div>

      {error && <p className="error">Could not reach the API: {error} — is the server running on port 4000?</p>}
      {!sessions && !error && <p>Loading…</p>}
      {sessions && sessions.length === 0 && (
        <p className="muted">
          No sessions yet. Open <a href="http://localhost:4000/" target="_blank" rel="noreferrer">the demo site</a> and
          click around, or run <code>npm run seed</code> in <code>server/</code>.
        </p>
      )}

      {sessions && sessions.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Session</th>
              <th>Events</th>
              <th>Page views</th>
              <th>Clicks</th>
              <th>Pages visited</th>
              <th>First seen</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session_id} onClick={() => nav(`/sessions/${s.session_id}`)} title="View user journey">
                <td className="mono" title={s.session_id}>{shortId(s.session_id)}</td>
                <td>{s.event_count}</td>
                <td>{s.page_view_count}</td>
                <td>{s.click_count}</td>
                <td>{s.pages_visited}</td>
                <td title={fmt(s.first_seen)}>{timeAgo(s.first_seen)}</td>
                <td title={fmt(s.last_seen)}>{timeAgo(s.last_seen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
