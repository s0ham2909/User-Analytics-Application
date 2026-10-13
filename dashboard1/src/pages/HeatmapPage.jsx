import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { getJSON } from '../api.js';
import { fmt, timeAgo } from '../time.js';

const DEMO_PAGES = [
  '/',
  '/products.html',
  '/cart.html',
  '/checkout.html',
  '/success.html',
];

export default function HeatmapPage() {
  const [pages, setPages] = useState([]);
  const [selectedPath, setSelectedPath] = useState('/');
  const [clicks, setClicks] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingClicks, setLoadingClicks] = useState(false);
  const [error, setError] = useState('');
  const [iframeHeight, setIframeHeight] = useState(900);
  const [containerWidth, setContainerWidth] = useState(1280);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [viewportMode, setViewportMode] = useState('auto'); // 'auto', '1536', '1280', '1440', '1920'

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const tableRef = useRef(null);

  // Measure container width for responsive scaling
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth || 1280);
      }
    }
    measure();

    let ro = null;
    if (window.ResizeObserver && containerRef.current) {
      ro = new ResizeObserver(() => measure());
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', measure);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Compute base width for iframe and overlay
  const baseWidth = useMemo(() => {
    if (viewportMode !== 'auto') {
      return parseInt(viewportMode, 10) || 1280;
    }
    // Auto-detect based on clicks recorded for this page
    if (clicks && clicks.length > 0) {
      // Find the most frequent viewport width among clicks
      const counts = {};
      clicks.forEach((c) => {
        const w = c.viewport?.w;
        if (w) counts[w] = (counts[w] || 0) + 1;
      });
      let maxW = 1280;
      let maxCount = 0;
      for (const [wStr, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          maxW = parseInt(wStr, 10);
        }
      }
      return maxW;
    }
    return 1280;
  }, [viewportMode, clicks]);

  const scale = useMemo(() => {
    if (!containerWidth || containerWidth >= baseWidth) return 1;
    return Math.max(0.2, containerWidth / baseWidth);
  }, [containerWidth, baseWidth]);

  // Adjust click X coordinate if recorded on a different viewport width
  // Center-aligned containers (like max-width: 1200px; margin: 0 auto) shift horizontally
  const getAdjustedX = useCallback(
    (c) => {
      const rawX = c.x || 0;
      const recordedW = c.viewport?.w;
      if (!recordedW || recordedW === baseWidth) return rawX;

      // When both are wide desktop screens with centered 1200px container:
      if (recordedW >= 1200 && baseWidth >= 1200) {
        return Math.round(rawX + (baseWidth - recordedW) / 2);
      }
      // Proportional fallback
      return Math.round((rawX / recordedW) * baseWidth);
    },
    [baseWidth]
  );

  // Load distinct page paths
  const loadPages = useCallback(async () => {
    setLoadingPages(true);
    try {
      const serverPages = await getJSON('/api/pages');
      const countsMap = {};
      serverPages.forEach((p) => {
        countsMap[p.path] = p.click_count || 0;
      });

      const mergedSet = new Set([...serverPages.map((p) => p.path), ...DEMO_PAGES]);
      const list = Array.from(mergedSet).map((p) => ({
        path: p,
        click_count: countsMap[p] || 0,
      }));

      list.sort((a, b) => {
        if (b.click_count !== a.click_count) return b.click_count - a.click_count;
        return a.path.localeCompare(b.path);
      });

      setPages(list);
      setSelectedPath((prev) => {
        if (prev && list.some((item) => item.path === prev)) return prev;
        return list[0]?.path || '/';
      });
      setError('');
    } catch (e) {
      setError(`Failed to load pages: ${e.message}`);
    } finally {
      setLoadingPages(false);
    }
  }, []);

  // Load clicks for the active path
  const loadClicks = useCallback(async (path) => {
    if (!path) return;
    setLoadingClicks(true);
    setHoveredIndex(null);
    try {
      const data = await getJSON(`/api/heatmap?path=${encodeURIComponent(path)}`);
      setClicks(data || []);
      setError('');
    } catch (e) {
      setError(`Failed to load heatmap data: ${e.message}`);
      setClicks([]);
    } finally {
      setLoadingClicks(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (selectedPath) {
      loadClicks(selectedPath);
    }
  }, [selectedPath, loadClicks]);

  function handleRefresh() {
    loadPages();
    if (selectedPath) {
      loadClicks(selectedPath);
    }
  }

  function handleIframeLoad() {
    try {
      const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (doc) {
        const body = doc.body;
        const html = doc.documentElement;
        const h = Math.max(
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          html?.clientHeight || 0,
          html?.scrollHeight || 0,
          html?.offsetHeight || 0,
          750
        );
        setIframeHeight(h + 20);
      }
    } catch (e) {
      setIframeHeight(900);
    }
  }

  const isDev = typeof window !== 'undefined' && window.location.port === '5173';
  const basePath = isDev ? '/demo-proxy' : '';
  const iframeSrc = `${basePath}${selectedPath}${selectedPath.includes('?') ? '&' : '?'}notrack=1`;

  const clickCount = clicks ? clicks.length : 0;
  const hoveredClick = hoveredIndex !== null && clicks && clicks[hoveredIndex] ? clicks[hoveredIndex] : null;

  return (
    <section className="heatmap-section">
      <div className="heatmap-toolbar">
        <div className="toolbar-left">
          <h2>Page Click Heatmap</h2>
          <div className="toolbar-controls">
            <select
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              aria-label="Select page for heatmap"
              disabled={loadingPages}
            >
              {pages.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.path} ({p.click_count} {p.click_count === 1 ? 'click' : 'clicks'})
                </option>
              ))}
            </select>

            <button type="button" onClick={handleRefresh} title="Refresh pages and click data">
              Refresh
            </button>

            <button
              type="button"
              className={showOverlay ? 'btn-active' : ''}
              onClick={() => setShowOverlay((v) => !v)}
              title="Toggle click overlay visibility"
            >
              {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
            </button>

            {/* Viewport size selector */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>Viewport:</span>
              <select
                value={viewportMode}
                onChange={(e) => setViewportMode(e.target.value)}
                title="Preview viewport width"
                style={{ fontSize: 13, padding: '5px 8px' }}
              >
                <option value="auto">Auto ({baseWidth}px)</option>
                <option value="1536">1536px (Laptop / Desktop)</option>
                <option value="1440">1440px (Wide)</option>
                <option value="1280">1280px (Standard)</option>
                <option value="1920">1920px (FHD)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="heatmap-meta">
            <span className="click-count-badge">
              <strong>{clickCount}</strong> {clickCount === 1 ? 'click' : 'clicks'} on {selectedPath}
            </span>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loadingClicks && <p className="muted">Loading heatmap clicks…</p>}

      {clicks && clicks.length === 0 && !loadingClicks && (
        <div className="notice-box">
          No clicks recorded for <code>{selectedPath}</code> yet. Browse the page or run <code>npm run seed</code> to generate events.
        </div>
      )}

      {showOverlay && clicks && clicks.length > 0 && (
        <div className="heatmap-legend">
          <span className="legend-sample" />
          <span>Overlapping click dots intensify into darker red hotspots. Hover or click any dot to inspect coordinates, timestamp, and viewport.</span>
        </div>
      )}

      {/* Responsive iframe + overlay preview container */}
      <div
        ref={containerRef}
        className="heatmap-container"
        style={{
          width: '100%',
          height: `${Math.round(iframeHeight * scale)}px`,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          marginBottom: 32,
        }}
      >
        <div
          className="heatmap-scaler"
          style={{
            width: `${baseWidth}px`,
            height: `${iframeHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* Embedded page */}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title={`Heatmap preview for ${selectedPath}`}
            scrolling="no"
            onLoad={handleIframeLoad}
            style={{
              width: `${baseWidth}px`,
              height: `${iframeHeight}px`,
              border: 'none',
              display: 'block',
              pointerEvents: 'none', // Prevents internal clicks/navigation while previewing
            }}
          />

          {/* Absolute click overlay */}
          {showOverlay && clicks && clicks.length > 0 && (
            <div
              className="heatmap-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${baseWidth}px`,
                height: `${iframeHeight}px`,
                pointerEvents: 'none',
              }}
            >
              {clicks.map((c, i) => {
                const adjX = getAdjustedX(c);
                const isHovered = hoveredIndex === i;
                return (
                  <span
                    key={i}
                    className={`heatmap-dot ${isHovered ? 'hovered' : ''}`}
                    style={{
                      left: `${adjX}px`,
                      top: `${c.y || 0}px`,
                      pointerEvents: 'auto',
                    }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex((curr) => (curr === i ? null : curr))}
                    onClick={() => {
                      setHoveredIndex(i);
                      // Scroll table row into view
                      const el = document.getElementById(`click-row-${i}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    title={`Click #${i + 1}\nCoordinates: x=${c.x}, y=${c.y}\nTimestamp: ${fmt(c.timestamp)}\nViewport: ${c.viewport?.w}×${c.viewport?.h}`}
                  />
                );
              })}

              {/* Floating Tooltip Card over hovered dot */}
              {hoveredClick && (
                <div
                  className="heatmap-tooltip-card"
                  style={{
                    position: 'absolute',
                    left: `${getAdjustedX(hoveredClick)}px`,
                    top: `${Math.max(12, (hoveredClick.y || 0) - 16)}px`,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'none',
                  }}
                >
                  <div className="tooltip-title">Click #{hoveredIndex + 1}</div>
                  <div className="tooltip-row">
                    <span className="tooltip-label">Coordinates:</span>
                    <strong className="mono coord-badge">x: {hoveredClick.x}, y: {hoveredClick.y}</strong>
                  </div>
                  <div className="tooltip-row">
                    <span className="tooltip-label">Timestamp:</span>
                    <span className="mono">{fmt(hoveredClick.timestamp)}</span>
                    <span className="muted" style={{ marginLeft: 4 }}>({timeAgo(hoveredClick.timestamp)})</span>
                  </div>
                  <div className="tooltip-row">
                    <span className="tooltip-label">Viewport Size:</span>
                    <span className="mono">
                      {hoveredClick.viewport ? `${hoveredClick.viewport.w} × ${hoveredClick.viewport.h}` : 'Unknown'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Click Details Inspection Table */}
      {clicks && clicks.length > 0 && (
        <div className="click-details-card" ref={tableRef}>
          <div className="row" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>
              Recorded Clicks on <code>{selectedPath}</code> ({clicks.length} total)
            </h3>
            <span className="muted">Hover a row to highlight its position on the heatmap above</span>
          </div>

          <div className="table-responsive" style={{ maxHeight: 380, overflowY: 'auto' }}>
            <table className="click-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th style={{ width: 170 }}>Coordinates (x, y)</th>
                  <th>Timestamp (Date & Time)</th>
                  <th style={{ width: 130 }}>Time Ago</th>
                  <th style={{ width: 160 }}>Viewport Size</th>
                  <th style={{ width: 100 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map((c, i) => {
                  const isHovered = hoveredIndex === i;
                  return (
                    <tr
                      key={i}
                      id={`click-row-${i}`}
                      className={`click-row ${isHovered ? 'row-active' : ''}`}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex((curr) => (curr === i ? null : curr))}
                    >
                      <td className="muted mono">{i + 1}</td>
                      <td>
                        <span className="coord-badge mono">
                          x: {c.x}, y: {c.y}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 13 }}>
                        {fmt(c.timestamp)}
                      </td>
                      <td className="muted">{timeAgo(c.timestamp)}</td>
                      <td className="mono">
                        {c.viewport ? `${c.viewport.w} × ${c.viewport.h}` : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '3px 8px', fontSize: 12 }}
                          onClick={() => setHoveredIndex(i)}
                        >
                          Highlight
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
