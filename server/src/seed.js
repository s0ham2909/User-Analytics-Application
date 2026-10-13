/**
 * Seeds the live server with plausible fake sessions so the dashboard has
 * data without browsing the demo site. Posts through the API, so it works
 * with whatever database the server is using (in-memory or Atlas).
 *
 * Usage: start the server (npm start), then in another terminal: npm run seed
 */
const API = process.env.API_URL || 'http://localhost:4000';

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

// Click "hotspot" regions per page, in page coordinates
function makeClicks(path, w) {
  let regions = [];
  if (path === '/') {
    regions = [
      { x: [120, 640], y: [15, 65], p: 0.9, max: 1 }, // nav links
      { x: [Math.round(w * 0.35), Math.round(w * 0.65)], y: [260, 320], p: 0.85, max: 2 }, // hero CTA
      { x: [140, Math.round(w * 0.85)], y: [480, 620], p: 0.6, max: 2 }, // cards
      { x: [200, w - 200], y: [700, 780], p: 0.3, max: 1 }, // footer
    ];
  } else if (path === '/products.html') {
    regions = [
      { x: [120, 640], y: [15, 65], p: 0.8, max: 1 }, // nav
      { x: [140, Math.round(w * 0.85)], y: [250, 420], p: 0.9, max: 3 }, // row 1 add-to-cart buttons
      { x: [140, Math.round(w * 0.85)], y: [520, 720], p: 0.8, max: 2 }, // row 2 add-to-cart buttons
      { x: [w - 180, w - 80], y: [20, 55], p: 0.7, max: 1 }, // cart nav link
    ];
  } else if (path === '/cart.html') {
    regions = [
      { x: [Math.round(w * 0.3), Math.round(w * 0.55)], y: [200, 350], p: 0.8, max: 3 }, // quantity buttons
      { x: [Math.round(w * 0.68), Math.round(w * 0.92)], y: [320, 370], p: 0.9, max: 2 }, // checkout button
    ];
  } else if (path === '/checkout.html') {
    regions = [
      { x: [Math.round(w * 0.15), Math.round(w * 0.55)], y: [180, 420], p: 0.9, max: 4 }, // form inputs
      { x: [Math.round(w * 0.15), Math.round(w * 0.55)], y: [460, 510], p: 0.95, max: 2 }, // place order button
    ];
  } else if (path === '/success.html') {
    regions = [
      { x: [Math.round(w * 0.35), Math.round(w * 0.65)], y: [340, 390], p: 0.8, max: 2 }, // continue shopping
    ];
  }

  const clicks = [];
  for (const r of regions) {
    if (Math.random() > r.p) continue;
    const k = 1 + rand(0, r.max - 1);
    for (let i = 0; i < k; i++) {
      clicks.push({ x: rand(r.x[0], r.x[1]), y: rand(r.y[0], r.y[1]) });
    }
  }
  return clicks;
}

async function post(event) {
  const res = await fetch(`${API}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`POST /api/events failed: ${res.status} ${await res.text()}`);
}

async function main() {
  const health = await fetch(`${API}/api/health`).catch(() => null);
  if (!health || !health.ok) {
    console.error(`[seed] server not reachable at ${API} — start it first: cd server && npm start`);
    process.exit(1);
  }

  const viewports = [
    [1440, 900],
    [1440, 900],
    [1366, 768],
    [1280, 800],
    [1920, 1080],
  ];
  const now = Date.now();
  let count = 0;

  for (let i = 0; i < 10; i++) {
    const session_id = crypto.randomUUID();
    const [w, h] = pick(viewports);
    let t = now - rand(1, 48 * 3600 * 1000);

    const push = async (path, type, extra = {}) => {
      count++;
      await post({
        session_id,
        type,
        path,
        url: `http://localhost:4000${path}`,
        timestamp: new Date(t).toISOString(),
        viewport: { w, h },
        ...extra,
      });
      t += rand(3, 90) * 1000;
    };

    // Sequential journey through storefront funnel
    await push('/', 'page_view');
    for (const c of makeClicks('/', w)) await push('/', 'click', c);

    if (Math.random() < 0.85) {
      await push('/products.html', 'page_view');
      for (const c of makeClicks('/products.html', w)) await push('/products.html', 'click', c);

      if (Math.random() < 0.7) {
        await push('/cart.html', 'page_view');
        for (const c of makeClicks('/cart.html', w)) await push('/cart.html', 'click', c);

        if (Math.random() < 0.6) {
          await push('/checkout.html', 'page_view');
          for (const c of makeClicks('/checkout.html', w)) await push('/checkout.html', 'click', c);

          if (Math.random() < 0.85) {
            await push('/success.html', 'page_view');
            for (const c of makeClicks('/success.html', w)) await push('/success.html', 'click', c);
          }
        }
      }
    }
  }

  console.log(`[seed] posted ${count} events across 10 sessions to ${API}`);
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
