// Reading a pasted link to build a card from it: fetch the page and take
// its title and description from the standard meta tags most sites set
// for sharing (og:title / og:description), falling back to <title> and
// the plain meta description. Deliberately small — a card only needs a
// name and one line of text, and the card links out to the page itself.
//
// App-walled sites (Xiaohongshu is the one the group actually pastes):
// a desktop fetch of a note link gets bounced to /login, whose page
// title is the site's generic slogan — useless on a card. With a mobile
// UA the same URL serves the note page itself; its og:title is empty,
// but the note's title/desc are in the page's embedded
// window.__INITIAL_STATE__ JSON, so look there too.
import { SCRAPE_UA } from '../listings/scrape.js';

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Site slogans that show up as the "title" of login walls and home
// shells. A card wearing one of these says nothing, so treat it as no
// title at all (the caller falls back to the hostname).
const GENERIC_TITLES = new Set(['小红书 - 你的生活兴趣社区', '小红书', 'Reddit', 'Reddit - Prove your humanity']);
// Titles of bot-check walls (Reddit's "Prove your humanity", Cloudflare's
// "Just a moment…", …) — the page behind them was never actually read.
const WALL_RE = /prove your humanity|are you a robot|verify you are human|just a moment/i;

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

async function fetchHtml(url, ms, ua) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: {
      'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9,zh;q=0.8' } });
    if (!r.ok) return null;
    if (!/text\/html|xhtml/i.test(r.headers.get('content-type') || '')) return null;
    // Pages can be megabytes of scripts; the meta tags live in the head.
    return { html: (await r.text()).slice(0, 400000), finalUrl: r.url || url };
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

// A share image only counts if it's an absolute http(s) URL — og:image
// is occasionally a relative path or a data URI, neither of which a
// card banner can use.
function cleanImg(u) {
  const v = decode(u || '').slice(0, 1000);
  return /^https?:\/\//i.test(v) ? v : '';
}

function metaInfo(html) {
  let title = decode(getMeta(html, 'property', 'og:title') || getMeta(html, 'name', 'twitter:title'));
  if (!title) {
    const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (m) title = decode(m[1]);
  }
  const blurb = decode(getMeta(html, 'property', 'og:description')
    || getMeta(html, 'name', 'description') || getMeta(html, 'name', 'twitter:description'));
  // The page's own share picture (og:image is the one every site sets
  // for link previews) — the card banner uses it instead of a bare emoji.
  const img = cleanImg(getMeta(html, 'property', 'og:image') || getMeta(html, 'name', 'twitter:image'));
  return { title, blurb, img };
}

// One string field out of a JSON-ish blob. The blob is not strict JSON
// (Xiaohongshu's state uses bare `undefined`), so pull the string
// literal out with a regex and unescape just that literal.
function stateField(seg, key) {
  const re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"', 'g');
  let m;
  while ((m = re.exec(seg))) {
    let v = '';
    try { v = JSON.parse('"' + m[1] + '"'); } catch (e) { v = m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"'); }
    v = decode(v);
    if (v) return v;
  }
  return '';
}

// The note's title/desc from window.__INITIAL_STATE__, when the page
// embeds it. Prefer the region around noteDetailMap, where the note
// being viewed lives; fall back to anywhere in the state blob.
function stateInfo(html) {
  const at = html.indexOf('__INITIAL_STATE__');
  if (at < 0) return { title: '', blurb: '', img: '' };
  const seg = html.slice(at, at + 400000);
  const nd = seg.indexOf('noteDetailMap');
  const region = nd >= 0 ? seg.slice(nd, nd + 100000) : seg;
  // The note's first photo: the state carries an imageList per note;
  // look for its urlDefault/url entries after that marker instead of
  // grabbing some unrelated "url" elsewhere in the blob.
  let img = '';
  const il = region.indexOf('imageList');
  if (il >= 0) {
    const pics = region.slice(il, il + 20000);
    img = cleanImg(stateField(pics, 'urlDefault') || stateField(pics, 'url'));
  }
  return { title: stateField(region, 'title') || stateField(seg, 'title'),
           blurb: stateField(region, 'desc') || stateField(seg, 'desc'), img };
}

const usable = title => !!title && !GENERIC_TITLES.has(title) && !WALL_RE.test(title);

async function fetchJson(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': SCRAPE_UA, 'Accept': 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

// Reddit walls off its post pages to non-browser fetches (the card ends
// up titled "Reddit - Prove your humanity") and its .json API 403s, but
// the oEmbed endpoint — built for third-party embeds — answers with the
// post's title and author. It only accepts canonical post URLs, so
// resolve share links (/r/<sub>/s/<code>, redd.it) to the post first.
async function redditInfo(url) {
  let post = url;
  if (!/\/comments\//.test(post)) {
    const got = await fetchHtml(url, 10000, SCRAPE_UA);
    if (got && /\/comments\//.test(got.finalUrl)) post = got.finalUrl;
  }
  const m = post.match(/(https?:\/\/(?:www\.)?reddit\.com\/r\/[^/]+\/comments\/[a-z0-9]+(?:\/[^?#]*)?)/i);
  if (!m) return null;
  const clean = m[1];
  const sub = (clean.match(/\/r\/([^/]+)/) || [])[1] || '';
  const data = await fetchJson('https://www.reddit.com/oembed?url=' + encodeURIComponent(clean), 10000);
  if (!data || !data.title) return null;
  const bits = ['Reddit' + (sub ? ' r/' + sub : ''), data.author_name ? '作者 u/' + data.author_name : ''];
  return { title: decode(String(data.title)), blurb: decode(bits.filter(Boolean).join(' · ')),
           img: cleanImg(data.thumbnail_url) };
}

// { ok, title, blurb, img } — ok:false when the page could not be read
// at all (blocked, not HTML, timed out). A generic site slogan never
// counts as a title; when a fetch lands on a login wall or finds
// nothing, retry once with a mobile UA and look in the embedded page
// state as well. img is the page's share picture (or '' when the page
// offers none) for the card banner.
export async function fetchLinkInfo(url) {
  // Reddit gets its own route (see redditInfo); the generic scrape below
  // only ever sees its bot wall.
  let host = '';
  try { host = new URL(url).hostname; } catch (e) { /* unusable URL: caller validates */ }
  if (/(^|\.)reddit\.com$/.test(host) || /(^|\.)redd\.it$/.test(host)) {
    const ri = await redditInfo(url);
    if (ri && usable(ri.title)) return { ok: true, title: ri.title.slice(0, 120), blurb: ri.blurb.slice(0, 220), img: ri.img || '' };
  }
  let title = '', blurb = '', img = '', read = false;
  const first = await fetchHtml(url, 10000, SCRAPE_UA);
  if (first) {
    read = true;
    ({ title, blurb, img } = metaInfo(first.html));
    const st = stateInfo(first.html);
    if (!usable(title) && st.title) title = st.title;
    if (!blurb && st.blurb) blurb = st.blurb;
    if (!img && st.img) img = st.img;
  }
  // Retry with a mobile UA when the desktop fetch failed outright, got
  // bounced to a login wall, or produced nothing usable — app-walled
  // sites often serve the real page to a phone browser instead.
  const walled = first && /\/login\b/.test(first.finalUrl);
  if (!first || walled || !usable(title)) {
    const mob = await fetchHtml(url, 10000, MOBILE_UA);
    if (mob) {
      read = true;
      const mt = metaInfo(mob.html);
      const ms = stateInfo(mob.html);
      if (!img) img = ms.img || mt.img;
      if (usable(ms.title) || usable(mt.title)) {
        title = usable(ms.title) ? ms.title : mt.title;
        blurb = ms.blurb || mt.blurb || blurb;
      } else if (!usable(title) && (ms.blurb || mt.blurb)) {
        blurb = ms.blurb || mt.blurb;
      }
    }
  }
  if (!read) return { ok: false, title: '', blurb: '', img: '' };
  if (!usable(title)) title = '';
  return { ok: true, title: title.slice(0, 120), blurb: blurb.slice(0, 220), img };
}
