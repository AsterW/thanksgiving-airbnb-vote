// Google Maps links, for activities: the reading itself lives in
// worker/lib/maplink.js (shared with restaurants and the hunt's hotels).
// This keeps the small interface activities use: is it a maps link, expand
// a share link, and the place's name and pin from the full URL.
import { isMapLink, readMapUrl } from '../lib/maplink.js';

export { expandLink } from '../lib/maplink.js';
export const isMapsLink = isMapLink;
// The user agent for reading Google's place data (photos.js).
export const UA = 'Mozilla/5.0 (compatible; thanksgiving-trip/1.0)';

// Name (without the street address the Maps app appends) and pin; any part can be missing.
export function readLink(u) {
  const p = readMapUrl(u);
  return { name: p.name.slice(0, 80), lat: p.lat, lng: p.lng };
}
