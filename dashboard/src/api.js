// Vite dev server proxies /api to the Express server (vite.config.js).
// Override with VITE_API_URL when the API lives elsewhere (e.g. Vercel deploy).
export const API = import.meta.env.VITE_API_URL || '';

export async function getJSON(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
