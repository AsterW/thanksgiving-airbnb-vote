// Up to 10 photos of a place, from the same detail request Google Maps makes
// when it opens the place page: the page HTML names it (/maps/preview/place?…),
// and its JSON lists the place's media. Best effort: any failure, or Google
// changing its format, just means the card has no photos.
import { UA } from './maps.js';

const MAX_PHOTOS = 10;
const PHOTO = 12; // media type in Google's data: 10 video, 11 Street View panorama, 12 photo

async function getText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    return r.ok ? await r.text() : null;
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

// Media entries look like [id, ?, type, …, [url, '', [width, height], …], …].
export function photosFromData(data) {
  const out = [], seen = new Set();
  (function walk(n) {
    if (!Array.isArray(n) || out.length >= MAX_PHOTOS) return;
    const img = n[6];
    if (typeof n[0] === 'string' && n[2] === PHOTO && Array.isArray(img) && typeof img[0] === 'string' && Array.isArray(img[2])) {
      const base = img[0].split('=')[0];
      const [w, h] = img[2];
      // Photos only: no profile pictures (/a/, /a-/), no panorama-shaped images.
      if (/^https:\/\/lh\d\.googleusercontent\.com\/(?!a-?\/)/.test(base) && w > 0 && h > 0 && w / h < 1.9 && !seen.has(base)) {
        seen.add(base);
        out.push(base + '=w720-h480-k-no');
      }
    }
    for (const c of n) walk(c);
  })(data);
  return out;
}

export async function placePhotos(mapsUrl) {
  try {
    const page = new URL(mapsUrl);
    page.searchParams.set('hl', 'en');
    const html = await getText(page.href);
    const m = html && html.match(/\/maps\/preview\/place\?[^"']+/);
    if (!m) return [];
    const raw = await getText('https://www.google.com' + m[0].replace(/&amp;/g, '&'));
    if (!raw) return [];
    return photosFromData(JSON.parse(raw.replace(/^\)\]\}'\s*/, '')));
  } catch (e) { return []; }
}
