// GET /api/weather?trip=…&lat=…&lng=…: the weather at one place for each day of
// the trip (the page asks for the region the listings are filtered to).
// Cached in KV for everyone: history never changes (kept for good), the
// forecast is refreshed at most every 3 hours. So Open-Meteo sees a few calls
// a day no matter how many people open the page.
import { j } from '../lib/http.js';
import { tripOf } from '../config/trips.js';
import { fetchForecast, fetchHistory, stayDays } from './openmeteo.js';

const FORECAST_TTL_MS = 3 * 60 * 60 * 1000;

async function placeWeather(env, place, days) {
  const key = 'weather:v1:' + place.lat + ',' + place.lng + ':' + days[0] + ':' + days[days.length - 1];
  const raw = await env.VOTES_KV.get(key);
  const c = raw ? JSON.parse(raw) : {};
  let changed = false;
  if (!c.forecast || c.forecastAt < Date.now() - FORECAST_TTL_MS) {
    try { c.forecast = await fetchForecast(place); c.forecastAt = Date.now(); changed = true; } catch (e) { /* keep the old one */ }
  }
  const forecast = c.forecast || {};
  const missing = days.filter(d => !forecast[d] && !(c.history && c.history[d]));
  if (missing.length) {
    try { c.history = { ...c.history, ...(await fetchHistory(place, missing)) }; changed = true; } catch (e) { /* try again next time */ }
  }
  if (changed) await env.VOTES_KV.put(key, JSON.stringify(c));
  return days.map(d => forecast[d] ? { date: d, ...forecast[d], source: 'forecast' }
    : c.history && c.history[d] ? { date: d, ...c.history[d], source: 'history' } : { date: d, kind: null });
}

async function handleWeather(req, env, url) {
  const trip = tripOf(url.searchParams.get('trip'));
  const q = url.searchParams;
  const lat = q.has('lat') ? Number(q.get('lat')) : NaN, lng = q.has('lng') ? Number(q.get('lng')) : NaN; // Number(null) would be 0
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return j({ ok: false, error: 'lat/lng required' }, 400);
  // Round to 0.1° (~10 km): weather doesn't change over that, and nearby
  // requests (a region's center moves a little as listings are added) share the cache.
  const place = { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 };
  return j({ ok: true, days: await placeWeather(env, place, stayDays(trip.checkIn, trip.checkOut)) });
}

export const routes = { 'GET /api/weather': handleWeather };
