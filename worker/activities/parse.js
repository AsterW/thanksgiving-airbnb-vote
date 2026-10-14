// Reading a pasted link to build a card from it: fetch the page and take
// its title and description from the standard meta tags most sites set
// for sharing (og:title / og:description), falling back to <title> and
// the plain meta description. Deliberately small — a card only needs a
// name and one line of text, and the card links out to the page itself.
import { SCRAPE_UA } from '../listings/scrape.js';

function getMeta(html, attr, key) {
  const m = html.match(new RegExp('<meta[^>]+' + attr + '=["\']' + key + '["\'][^>]*content=["\']([^"\']*)["\']', 'i'))
       || html.match(new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*' + attr + '=["\']' + key + '["\']', 'i'));
  return m ? m[1] : '';
}

// Meta content arrives HTML-escaped; turn the common entities back into text.
function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').trim();
}

async function fetchHtml(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: {
      'User-Agent': SCRAPE_UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9,zh;q=0.8' } });
    if (!r.ok) return null;
    if (!/text\/html|xhtml/i.test(r.headers.get('content-type') || '')) return null;
    // Pages can be megabytes of scripts; the meta tags live in the head.
    return (await r.text()).slice(0, 300000);
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

// { ok, title, blurb } — ok:false when the page could not be read at all
// (blocked, not HTML, timed out); title/blurb may still be empty on an
// ok page that simply has no meta tags, callers fall back as they like.
export async function fetchLinkInfo(url) {
  const html = await fetchHtml(url, 10000);
  if (!html) return { ok: false, title: '', blurb: '' };
  let title = decode(getMeta(html, 'property', 'og:title') || getMeta(html, 'name', 'twitter:title'));
  if (!title) {
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (m) title = decode(m[1]);
  }
  const blurb = decode(getMeta(html, 'property', 'og:description')
    || getMeta(html, 'name', 'description') || getMeta(html, 'name', 'twitter:description'));
  return { ok: true, title: title.slice(0, 120), blurb: blurb.slice(0, 220) };
}
