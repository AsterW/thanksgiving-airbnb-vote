// localStorage / sessionStorage can throw (private mode, blocked site data).
export function load(key, fallback = null, store = 'local') {
  try { const v = (store === 'session' ? sessionStorage : localStorage).getItem(key); return v === null ? fallback : v; }
  catch (e) { return fallback; }
}
export function save(key, value, store = 'local') {
  try { (store === 'session' ? sessionStorage : localStorage).setItem(key, value); } catch (e) {}
}
