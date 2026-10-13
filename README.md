# Simple User Analytics

A full-stack user analytics application for e-commerce sites: a drop-in vanilla JavaScript tracker records `page_view` and `click` events, a Node.js/Express + MongoDB API stores and aggregates them, and a React dashboard displays **sessions**, detailed **user journeys**, and an embedded **click heatmap** with an overlay preview for each page.

![Sessions view](docs/screenshot-sessions.png)
![Heatmap view](docs/screenshot-heatmap.png)

## Tech Stack

| Layer       | Technology                                             |
| ----------- | ------------------------------------------------------ |
| **Tracker** | Vanilla JS, single file (`tracker.js`), no deps        |
| **Backend** | Node.js + Express 5 + Mongoose                         |
| **Database**| MongoDB (in-memory for zero-config dev, Atlas for prod)|
| **Dashboard**| React 18 + Vite + React Router 6                      |
| **Demo site**| Static HTML, CSS, and JS served directly by Express    |

---

## Quick Start

Prerequisites: **Node 18+**. A separate MongoDB installation is *not* required — by default, the API boots an in-memory MongoDB via `mongodb-memory-server` (data resets on restart).

```bash
# 1. Start the API + Demo Storefront + Dashboard (terminal 1)
cd server
npm install
npm start
# -> http://localhost:4000            (demo storefront, tracked)
# -> http://localhost:4000/dashboard  (built React dashboard)

# 2. (Optional) Run Dashboard in dev mode with HMR (terminal 2)
cd dashboard
npm install
npm run dev
# -> http://localhost:5173            (proxies /api and preview to :4000)
```

### Seeding Test Data

To populate the database with realistic multi-step funnel sessions:

```bash
cd server
npm run seed
```

This seeds sequential journeys spanning `/` → `/products.html` → `/cart.html` → `/checkout.html` → `/success.html` with click hotspots on navigation links, product add-to-cart buttons, quantity adjustments, and checkout actions.

### Using a Real MongoDB Cluster

```bash
cp server/.env.example server/.env
# Edit MONGODB_URI in server/.env:
# e.g. MONGODB_URI=mongodb://127.0.0.1:27017/analytics or an Atlas SRV string
```

---

## Demo Storefront

A working e-commerce storefront with a clean light theme, shared styling (`/styles.css`), and shared cart management (`/cart.js`):

- **`/` (Home):** Workshop hero section, feature cards (Tools, Materials, Guides), and CTA links directing to `/products.html`.
- **`/products.html`:** Catalog of 8 workshop products with name, price, icon thumbnail, and "Add to cart" buttons.
- **`/cart.html`:** Full shopping cart showing added items, quantity increment/decrement (`+` / `−`), item removal, and order subtotals with a "Proceed to Checkout" button.
- **`/checkout.html`:** Shipping details form (name, email, street address, city, zip), order summary, and "Place Order" button.
- **`/success.html`:** Order confirmation screen with a generated order ID and links to continue shopping.
- **Cart Badge:** Navbar displays a live item-count badge across every page, synchronized in real time via `localStorage` (key: `'cart'`). Placing an order clears the cart.

---

## Tracker Specification

Embed `tracker.js` via a single script tag:

```html
<script src="/tracker.js" data-api="http://localhost:4000"></script>
```

- When `data-api` is omitted, events post to the current window origin.
- **Tracked Events:** Strictly captures only `page_view` (sent on page load) and `click` (listened passively on `document`).
- **Data Payload:**
  - `session_id`: Stored in `localStorage` under `analytics_session_id`, reused across all site pages. Automatically generates a new session ID after 30 minutes of inactivity.
  - `type`: Either `'page_view'` or `'click'`.
  - `url`: Full client URL (e.g. `http://localhost:4000/cart.html`).
  - `path`: Normalized pathname without query strings or hashes (e.g. `/cart.html`).
  - `timestamp`: Client timestamp in ISO 8601 format.
  - `x` and `y`: For `click` events, exact page coordinates (`pageX` and `pageY`).
  - `viewport`: Viewport dimensions `{ w, h }` at the time of click.
- **Resilient Transport:** Delivered using `fetch(..., { keepalive: true })` with fallback to `navigator.sendBeacon`, guaranteeing clicks that navigate away (such as clicking checkout links or form submissions) are not dropped.
- **Self-Exclusion / Loop Prevention:** The tracker automatically skips tracking when embedded inside an `<iframe>` (`window.self !== window.top`) or when the URL contains `?notrack=1`. This prevents viewing the dashboard heatmap from recording synthetic clicks or polluting analytics.

---

## API Reference

| Endpoint                               | Method | Description                                                |
| -------------------------------------- | ------ | ---------------------------------------------------------- |
| `/api/events`                          | `POST` | Store validated event (16 KB payload cap, path sanitized)   |
| `/api/sessions`                        | `GET`  | Aggregate list of sessions, newest first                   |
| `/api/sessions/:id/events`             | `GET`  | Ordered event journey for a specific session               |
| `/api/pages`                           | `GET`  | Distinct paths with total event and click counts           |
| `/api/heatmap?path=/products.html`     | `GET`  | Click coordinates (`x`, `y`, `viewport`) for a given path  |
| `/api/health`                          | `GET`  | Liveness check                                             |

---

## Dashboard

Accessed at `/dashboard` (built React SPA):

1. **Sessions View:**
   - Table of all visitor sessions with event count, page views, clicks, unique pages visited, first seen, and last seen.
   - Clicking any session row opens its chronological user journey.
2. **Session Journey Detail:**
   - Prominent **Back to sessions** button.
   - Header showing the full `session_id` and journey summary.
   - Tabular journey of all events in chronological order, displaying step `#`, event type badge, full page URL, full date/time timestamp, and click coordinates (`x: ..., y: ...` or explicit `—` for `page_view` events).
3. **Heatmap View (Embedded Preview + Overlay):**
   - Page dropdown containing all tracked paths and storefront pages.
   - **Refresh** button to update page list and click coordinates.
   - **Embedded `<iframe>` Preview:** Renders the selected storefront page at a fixed 1280px width (with responsive CSS transform scaling for narrower viewports) and dynamic height matching the document height.
   - **Click Overlay:** Absolutely positioned canvas displaying clicks as semi-transparent red radial-gradient dots; overlapping clicks visually intensify into darker red hotspots.
   - **Controls:** Total click counter per page and an **Overlay Toggle** button to switch the heatmap dots on or off.

---

## Project Structure

```
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js          # Express app entrypoint & static file servers
│       ├── db.js             # Mongoose connection (in-memory or Atlas)
│       ├── seed.js           # Multi-step funnel traffic generator
│       ├── models/
│       │   └── Event.js      # Mongoose Event schema & indexes
│       └── routes/
│           ├── events.js     # POST /api/events ingestion
│           └── analytics.js  # Aggregation & heatmap query routes
├── tracker/
│   └── tracker.js            # Zero-dependency client tracker snippet
├── dashboard/
│   ├── package.json
│   ├── vite.config.js        # Vite config with demo reverse-proxy
│   ├── src/
│   │   ├── api.js            # API request helper
│   │   ├── time.js           # Timestamp formatting helpers
│   │   ├── App.jsx           # App layout and route definitions
│   │   ├── index.css         # Dashboard and heatmap styling
│   │   └── pages/
│   │       ├── SessionsPage.jsx   # Sessions table
│   │       ├── SessionDetail.jsx  # Detailed session user journey
│   │       └── HeatmapPage.jsx    # Iframe embedded heatmap overlay
│   └── dist/                 # Built production SPA (served by Express)
├── demo/
│   ├── styles.css            # Shared storefront stylesheet
│   ├── cart.js               # Shared cart manager & badge updater
│   ├── index.html            # Store home page
│   ├── products.html         # Product catalog (8 products)
│   ├── cart.html             # Cart contents & quantity adjustments
│   ├── checkout.html         # Shipping form & simulated checkout
│   └── success.html          # Order confirmation screen
└── docs/
    └── screenshots/
```

---

## Deployment on Vercel

The repository is configured for **All-in-One deployment on Vercel** (serving the demo storefront, the drop-in tracker, the React dashboard, and the Express API via serverless functions on the same domain):

### 1. Database Prerequisite (MongoDB Atlas)
Since Vercel Serverless Functions are stateless, you cannot use the dev in-memory MongoDB. You need a free cloud MongoDB:
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Copy your connection string (e.g. `mongodb+srv://user:password@cluster.mongodb.net/analytics?retryWrites=true&w=majority`).

### 2. Deploy via Vercel Dashboard (GitHub)
1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new) and import the repository.
3. Under **Environment Variables**, add:
   - `MONGODB_URI` = `your_mongodb_atlas_connection_string`
4. Leave Root Directory as `./` (Vercel automatically detects `vercel.json` and builds everything).
5. Click **Deploy**.

### 3. Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Add your environment variable
vercel env add MONGODB_URI

# Deploy to production
vercel --prod
```

Once deployed, your Vercel URL will host:
- `https://your-project.vercel.app/` (Working demo storefront)
- `https://your-project.vercel.app/tracker.js` (Drop-in tracking script)
- `https://your-project.vercel.app/dashboard` (React analytics dashboard)
- `https://your-project.vercel.app/api/*` (Express serverless endpoints)

---

## Assumptions & Trade-Offs

- **Heatmap Coordinates & Layout Shifts:** Clicks are recorded as absolute document coordinates (`pageX`, `pageY`). Because page layouts and responsive elements can shift at different viewport widths, the heatmap overlay provides an accurate representation when viewed at standard desktop widths (1280px base).
- **Client Timestamps:** Client-provided ISO timestamps are trusted for ordering user journeys, with basic sanity clamping against far-future timestamps. Server time is recorded as `created_at` as a fallback.
- **Stateless Aggregations:** Sessions and heatmaps are derived directly from the `events` collection using MongoDB aggregation pipelines rather than storing redundant session documents.
- **Authentication & Multi-Tenancy:** By design, there is no authentication or multi-tenant API key validation. In a multi-site production environment, per-site API tokens and dashboard authentication would be added.
- **Client-Side Session Expiry:** The 30-minute inactivity session threshold is calculated client-side in `localStorage`.
