const PAGE = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Denver 感恩节之旅 · Airbnb 一起选房</title>\n<script src=\"https://cdn.tailwindcss.com\"></script>\n<style>\n  body { font-family: -apple-system, \"PingFang SC\", \"Microsoft YaHei\", sans-serif; }\n  .card-img { aspect-ratio: 16/10; object-fit: cover; }\n  .chip { display:inline-block; background:#eef2ff; color:#4f46e5; font-size:12px; padding:2px 8px; border-radius:9999px; margin:2px 2px 0 0; }\n  .filter-chip { cursor:pointer; }\n  .filter-chip.active { background:#4f46e5; color:#fff; }\n  #nameModal { display:none; }\n  #nameModal.open { display:flex; }\n  .vote-btn.voted { background:#e11d48 !important; color:#fff !important; border-color:#e11d48 !important; }\n  .carousel { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; overscroll-behavior-x:contain; }\n  .carousel::-webkit-scrollbar { display:none; }\n  .carousel > img { flex:0 0 100%; width:100%; scroll-snap-align:start; }\n  .car-dots { position:absolute; left:0; right:0; bottom:10px; display:flex; justify-content:center; gap:6px; pointer-events:none; }\n  .car-dots button { width:7px; height:7px; border-radius:9999px; background:rgba(255,255,255,.55); box-shadow:0 0 2px rgba(0,0,0,.4); pointer-events:auto; transition:transform .2s, background .2s; }\n  .car-dots button.on { background:#fff; transform:scale(1.3); }\n  .car-arrow { position:absolute; top:50%; transform:translateY(-50%); width:30px; height:30px; border-radius:9999px; background:rgba(255,255,255,.9); color:#334155; font-size:18px; line-height:30px; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,.25); opacity:0; transition:opacity .2s; }\n  .car-wrap:hover .car-arrow:not([disabled]) { opacity:1; }\n  .car-arrow[disabled] { visibility:hidden; }\n  @media (hover:none) { .car-arrow { display:none; } }\n  .just-voted { box-shadow: 0 0 0 3px #fb7185, 0 10px 25px -5px rgba(225,29,72,.35); transition: box-shadow .6s ease; }\n</style>\n</head>\n<body class=\"bg-slate-100 min-h-screen\">\n\n<header class=\"bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white px-6 py-8\">\n  <div class=\"max-w-6xl mx-auto\">\n    <h1 class=\"text-2xl md:text-3xl font-bold\">🏔️ Denver 感恩节之旅 · Airbnb 一起选房</h1>\n    <p class=\"mt-2 text-indigo-100\">11月25–29 · 10–15人 · 看中哪间就把 Airbnb 链接贴进来，票数最高的我们就订它</p>\n  </div>\n</header>\n\n<main class=\"max-w-6xl mx-auto px-4 py-6\">\n\n  <!-- 加房源 -->\n  <section class=\"bg-white rounded-2xl shadow p-5 mb-6\">\n    <h2 class=\"font-bold text-lg mb-3\">➕ 添加候选房源</h2>\n    <div class=\"flex flex-col md:flex-row gap-3\">\n      <input id=\"urlInput\" type=\"url\" placeholder=\"粘贴 Airbnb 房源链接，例如 https://www.airbnb.com/rooms/123456…\"\n        class=\"flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500\">\n      <button id=\"addBtn\" class=\"bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-3\">加入清单</button>\n    </div>\n    <p id=\"addMsg\" class=\"text-sm mt-2 text-slate-500\"></p>\n    <details id=\"manualBox\" class=\"mt-3 text-sm\">\n      <summary class=\"cursor-pointer text-indigo-600 font-medium\">自动抓取失败？点这里手动添加</summary>\n      <div class=\"grid md:grid-cols-2 gap-3 mt-3\">\n        <input id=\"mUrl\" class=\"border rounded-lg px-3 py-2\" placeholder=\"房源链接 *\">\n        <input id=\"mTitle\" class=\"border rounded-lg px-3 py-2\" placeholder=\"房源标题 *\">\n        <input id=\"mImage\" class=\"border rounded-lg px-3 py-2\" placeholder=\"照片链接（可选）\">\n        <input id=\"mPrice\" class=\"border rounded-lg px-3 py-2\" type=\"number\" placeholder=\"4晚总价 USD（可选）\">\n        <input id=\"mBedrooms\" class=\"border rounded-lg px-3 py-2\" type=\"number\" placeholder=\"卧室数\">\n        <input id=\"mBeds\" class=\"border rounded-lg px-3 py-2\" type=\"number\" placeholder=\"床位数\">\n        <input id=\"mBaths\" class=\"border rounded-lg px-3 py-2\" placeholder=\"浴室数（可填 2.5）\">\n        <input id=\"mSleeps\" class=\"border rounded-lg px-3 py-2\" type=\"number\" placeholder=\"可住人数\">\n        <select id=\"mArea\" class=\"border rounded-lg px-3 py-2\">\n          <option value=\"\">区域（可选）</option>\n          <option>大沙丘区域</option>\n          <option>落基山 · Estes Park</option>\n          <option>其他</option>\n        </select>\n        <input id=\"mNote\" class=\"border rounded-lg px-3 py-2\" placeholder=\"一句话亮点（可选）\">\n      </div>\n      <button id=\"manualBtn\" class=\"mt-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-5 py-2\">手动加入</button>\n    </details>\n  </section>\n\n  <!-- 工具条 -->\n  <section class=\"flex flex-wrap items-center gap-2 mb-4\">\n    <button data-f=\"all\" class=\"filter-chip active border rounded-full px-4 py-1.5 text-sm bg-white\">全部</button>\n    <button data-f=\"大沙丘区域\" class=\"filter-chip border rounded-full px-4 py-1.5 text-sm bg-white\">大沙丘区域</button>\n    <button data-f=\"落基山 · Estes Park\" class=\"filter-chip border rounded-full px-4 py-1.5 text-sm bg-white\">落基山 · Estes Park</button>\n    <select id=\"sortSel\" class=\"ml-auto border rounded-full px-4 py-1.5 text-sm bg-white\">\n      <option value=\"votes\">按票数排序</option>\n      <option value=\"price\">按价格从低到高</option>\n    </select>\n    <span id=\"countLbl\" class=\"text-sm text-slate-500 w-full md:w-auto\"></span>\n  </section>\n\n  <!-- 列表 -->\n  <section id=\"grid\" class=\"grid md:grid-cols-2 lg:grid-cols-3 gap-5\"></section>\n  <p class=\"text-center text-slate-400 text-sm mt-10 mb-6\">有链接的人都能加房源、投票 · 数据实时共享</p>\n</main>\n\n<!-- 名字弹窗 -->\n<div id=\"nameModal\" class=\"fixed inset-0 bg-black/50 items-center justify-center z-50\">\n  <div class=\"bg-white rounded-2xl p-6 w-80\">\n    <h3 class=\"font-bold mb-2\">怎么称呼你？</h3>\n    <p class=\"text-sm text-slate-500 mb-3\">投票会显示名字，方便大家知道是谁投的（只问一次）</p>\n    <input id=\"nameInput\" class=\"border rounded-lg px-3 py-2 w-full mb-3\" placeholder=\"比如 Ken\" maxlength=\"20\">\n    <button id=\"nameOk\" class=\"bg-indigo-600 text-white rounded-xl px-5 py-2 w-full font-bold\">确定</button>\n  </div>\n</div>\n\n<script>\nconst $ = s => document.querySelector(s);\nlet STATE = { listings: [] };\nlet myToken = localStorage.getItem('vt');\nif (!myToken) { myToken = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()); localStorage.setItem('vt', myToken); }\nlet myName = localStorage.getItem('vn') || '';\nlet filter = 'all', sortBy = 'votes';\nlet pendingVoteId = null;\n\nfunction esc(s){ return String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c])); }\nasync function api(path, method, body){\n  const r = await fetch(path, { method: method || 'GET', headers: {'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined });\n  return r.json();\n}\n\nfunction statsLine(l){\n  const parts = [];\n  if (l.bedrooms) parts.push(l.bedrooms + '卧');\n  if (l.beds) parts.push(l.beds + '床');\n  if (l.bathrooms) parts.push(l.bathrooms + '卫');\n  if (l.sleeps) parts.push('可住' + l.sleeps + '人');\n  return parts.length ? parts.join(' · ') : '户型信息待补充';\n}\n\nfunction card(l){\n  const voted = (l.votes || []).some(v => v.token === myToken);\n  const n = (l.votes || []).length;\n  const voters = (l.votes || []).map(v => '<span class=\"chip\">' + esc(v.name || '匿名') + '</span>').join('');\n  const price = l.priceUSD ? '<div class=\"text-lg font-bold text-slate-800\">约 $' + Number(l.priceUSD).toLocaleString() + ' <span class=\"text-xs font-normal text-slate-500\">/ 4晚含税费</span></div>'\n    : '<div class=\"text-sm text-slate-500\">价格以 Airbnb 页面为准</div>';\n  const rating = l.rating ? '<span class=\"text-sm\">⭐ ' + l.rating + (l.reviews ? '（' + l.reviews + '条评价）' : '') + '</span>' : '';\n  const area = l.area ? '<span class=\"absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full\">' + esc(l.area) + '</span>' : '';\n  const del = '<button onclick=\"removeListing(\\'' + l.id + '\\')\" title=\"删除这个房源\" class=\"absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-full\">✕</button>';\n  const pics = (l.images && l.images.length) ? l.images : (l.image ? [l.image] : []);\n  let img;\n  if (!pics.length) img = '<div class=\"card-img w-full rounded-t-2xl bg-slate-200 flex items-center justify-center text-slate-400 text-4xl\">🏠</div>';\n  else if (pics.length === 1) img = '<img src=\"' + esc(pics[0]) + '\" class=\"card-img w-full rounded-t-2xl\" loading=\"lazy\" alt=\"\">';\n  else img = '<div class=\"carousel rounded-t-2xl\" onscroll=\"carSync(this)\">'\n      + pics.map(u => '<img src=\"' + esc(u) + '\" class=\"card-img\" loading=\"lazy\" alt=\"\">').join('') + '</div>'\n      + '<button class=\"car-arrow left-2\" onclick=\"carStep(this,-1)\" aria-label=\"上一张\" disabled>‹</button>'\n      + '<button class=\"car-arrow right-2\" onclick=\"carStep(this,1)\" aria-label=\"下一张\">›</button>'\n      + '<div class=\"car-dots\">' + pics.map((_, i) => '<button onclick=\"carGo(this,' + i + ')\" aria-label=\"第' + (i + 1) + '张\"' + (i ? '' : ' class=\"on\"') + '></button>').join('') + '</div>';\n  return '<article data-id=\"' + esc(l.id) + '\" class=\"bg-white rounded-2xl shadow overflow-hidden flex flex-col\">'\n    + '<div class=\"relative car-wrap\">' + img + area + del + '</div>'\n    + '<div class=\"p-4 flex flex-col flex-1\">'\n    + '<h3 class=\"font-bold leading-snug mb-1\">' + esc(l.title || '未命名房源') + '</h3>'\n    + '<p class=\"text-sm text-slate-500 mb-2\">' + esc(statsLine(l)) + '</p>'\n    + '<div class=\"mb-1\">' + price + '</div>'\n    + '<div class=\"mb-2\">' + rating + '</div>'\n    + (l.note ? '<p class=\"text-sm text-slate-600 mb-2\">💡 ' + esc(l.note) + '</p>' : '')\n    + (voters ? '<div class=\"mb-3\">' + voters + '</div>' : '<div class=\"mb-3 text-xs text-slate-400\">还没有人投票，来当第一个吧</div>')\n    + '<div class=\"mt-auto flex gap-2\">'\n    + '<button onclick=\"doVote(\\'' + l.id + '\\')\" class=\"vote-btn flex-1 border-2 border-rose-500 text-rose-600 font-bold rounded-xl py-2 ' + (voted ? 'voted' : '') + '\">' + (voted ? '❤️ 已投 · ' : '🤍 投票 · ') + n + '</button>'\n    + '<a href=\"' + esc(l.url) + '\" target=\"_blank\" rel=\"noopener\" class=\"border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400\">去 Airbnb ↗</a>'\n    + '</div></div></article>';\n}\n\n// ---- photo carousel ----\nconst slideIdx = {}; // listing id -> current photo, so re-renders keep your place\nfunction carOf(el){ return el.closest('.car-wrap').querySelector('.carousel'); }\nfunction carSync(c){\n  const i = Math.round(c.scrollLeft / c.clientWidth);\n  const wrap = c.closest('.car-wrap');\n  wrap.querySelectorAll('.car-dots button').forEach((d, k) => d.classList.toggle('on', k === i));\n  const [prev, next] = wrap.querySelectorAll('.car-arrow');\n  prev.disabled = i <= 0; next.disabled = i >= c.children.length - 1;\n  const art = c.closest('article'); if (art) slideIdx[art.dataset.id] = i;\n}\nfunction carGo(el, i){ const c = carOf(el); c.scrollTo({ left: i * c.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' }); }\nfunction carStep(el, d){ const c = carOf(el); carGo(el, Math.round(c.scrollLeft / c.clientWidth) + d); }\nfunction restoreSlides(root){\n  root.querySelectorAll('article[data-id] .carousel').forEach(c => {\n    const i = slideIdx[c.closest('article').dataset.id];\n    if (i) { c.scrollLeft = i * c.clientWidth; carSync(c); }\n  });\n}\n\nconst reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\nlet reorderTimer = null;\n\n// Re-render the grid. Cards that change position glide to their new spot (FLIP).\n// If anchorId is given, the page scrolls so that card stays where it was on screen.\nfunction render(anchorId){\n  if (reorderTimer) { clearTimeout(reorderTimer); reorderTimer = null; }\n  const grid = $('#grid');\n  const before = {};\n  grid.querySelectorAll('article[data-id]').forEach(el => { before[el.dataset.id] = el.getBoundingClientRect(); });\n  let list = STATE.listings.slice();\n  if (filter !== 'all') list = list.filter(l => l.area === filter);\n  if (sortBy === 'votes') list.sort((a,b) => (b.votes||[]).length - (a.votes||[]).length || (a.priceUSD||1e9) - (b.priceUSD||1e9));\n  else list.sort((a,b) => (a.priceUSD||1e9) - (b.priceUSD||1e9));\n  grid.innerHTML = list.length ? list.map(card).join('') : '<p class=\"text-slate-400 col-span-full text-center py-10\">这个区域还没有候选，贴个链接进来吧 👆</p>';\n  $('#countLbl').textContent = '共 ' + STATE.listings.length + ' 间候选';\n  restoreSlides(grid);\n\n  const anchorEl = anchorId && grid.querySelector('article[data-id=\"' + CSS.escape(anchorId) + '\"]');\n  if (anchorEl && before[anchorId]) window.scrollBy(0, anchorEl.getBoundingClientRect().top - before[anchorId].top);\n  if (reduceMotion) return;\n  grid.querySelectorAll('article[data-id]').forEach(el => {\n    const a = before[el.dataset.id];\n    if (!a) return;\n    const b = el.getBoundingClientRect();\n    const dx = a.left - b.left, dy = a.top - b.top;\n    if (!dx && !dy) return;\n    el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],\n      { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });\n  });\n}\n\n// After a vote: update just that card in place first, then reorder a moment later\n// so the user sees their vote land before the list shuffles.\nfunction afterVote(id, votes){\n  const i = STATE.listings.findIndex(x => x.id === id);\n  if (i < 0) return;\n  STATE.listings[i].votes = votes;\n  const old = $('#grid').querySelector('article[data-id=\"' + CSS.escape(id) + '\"]');\n  if (!old || sortBy !== 'votes') { render(id); return; }\n  old.outerHTML = card(STATE.listings[i]);\n  restoreSlides($('#grid'));\n  if (reorderTimer) clearTimeout(reorderTimer);\n  reorderTimer = setTimeout(() => {\n    render(id);\n    const el = $('#grid').querySelector('article[data-id=\"' + CSS.escape(id) + '\"]');\n    if (el) { el.classList.add('just-voted'); setTimeout(() => el.classList.remove('just-voted'), 1200); }\n  }, 700);\n}\n\nasync function refresh(){ const s = await api('/api/state'); STATE = s; render(); enrichMissing(); }\n\nasync function enrichMissing(){\n  for (const l of STATE.listings) {\n    if (!l.image || l.rating == null || !l.images || l.images.length < 2) {\n      try { const r = await api('/api/enrich', 'POST', { id: l.id }); if (r.ok && r.listing && (r.listing.image || (r.listing.images && r.listing.images.length))) { const i = STATE.listings.findIndex(x => x.id === l.id); if (i >= 0) STATE.listings[i] = r.listing; render(); } } catch(e){}\n    }\n  }\n}\n\nfunction ensureNameThen(fn){\n  if (myName) { fn(); return; }\n  pendingVoteId = true; pendingFn = fn;\n  $('#nameModal').classList.add('open');\n  $('#nameInput').focus();\n}\nlet pendingFn = null;\n$('#nameOk').onclick = () => {\n  const v = $('#nameInput').value.trim();\n  if (!v) return;\n  myName = v; localStorage.setItem('vn', v);\n  $('#nameModal').classList.remove('open');\n  if (pendingFn) { const f = pendingFn; pendingFn = null; f(); }\n};\n\nasync function doVote(id){\n  const l = STATE.listings.find(x => x.id === id);\n  const voted = (l.votes || []).some(v => v.token === myToken);\n  if (voted) {\n    const r = await api('/api/vote', 'POST', { id, token: myToken, name: null });\n    if (r.ok) afterVote(id, r.votes);\n  } else {\n    ensureNameThen(async () => {\n      const r = await api('/api/vote', 'POST', { id, token: myToken, name: myName });\n      if (r.ok) afterVote(id, r.votes);\n    });\n  }\n}\n\nasync function removeListing(id){\n  const l = STATE.listings.find(x => x.id === id);\n  if (!l) return;\n  if (!confirm('确定要删除「' + (l.title || '未命名房源') + '」吗？删掉后大家就看不到了。')) return;\n  const r = await api('/api/remove', 'POST', { id });\n  if (r.ok) await refresh(); else alert('删除失败，稍后再试');\n}\n\nasync function addListing(){\n  const url = $('#urlInput').value.trim();\n  if (!url) return;\n  const btn = $('#addBtn'); btn.disabled = true; btn.textContent = '抓取中…';\n  $('#addMsg').textContent = '正在读取 Airbnb 房源信息…';\n  try {\n    const r = await api('/api/add', 'POST', { url });\n    if (r.ok) {\n      $('#urlInput').value = '';\n      $('#addMsg').textContent = r.deduped ? '这间已经在清单里了' : '已加入清单 🎉';\n      $('#addMsg').className = 'text-sm mt-2 text-green-600';\n      await refresh();\n      window.scrollTo({ top: 0, behavior: 'smooth' });\n    } else {\n      $('#addMsg').textContent = '自动抓取失败：' + (r.error || '未知错误') + '，可以用下面的手动添加';\n      $('#addMsg').className = 'text-sm mt-2 text-amber-600';\n      $('#mUrl').value = url;\n      $('#manualBox').open = true;\n    }\n  } catch(e) {\n    $('#addMsg').textContent = '网络有点问题，稍后再试';\n    $('#addMsg').className = 'text-sm mt-2 text-red-500';\n  }\n  btn.disabled = false; btn.textContent = '加入清单';\n}\n$('#addBtn').onclick = addListing;\n$('#urlInput').addEventListener('keydown', e => { if (e.key === 'Enter') addListing(); });\n\n$('#manualBtn').onclick = async () => {\n  const body = { url: $('#mUrl').value.trim(), title: $('#mTitle').value.trim(), image: $('#mImage').value.trim(),\n    priceUSD: $('#mPrice').value ? Number($('#mPrice').value) : null,\n    bedrooms: $('#mBedrooms').value ? Number($('#mBedrooms').value) : null,\n    beds: $('#mBeds').value ? Number($('#mBeds').value) : null,\n    bathrooms: $('#mBaths').value ? Number($('#mBaths').value) : null,\n    sleeps: $('#mSleeps').value ? Number($('#mSleeps').value) : null,\n    area: $('#mArea').value, note: $('#mNote').value.trim() };\n  if (!body.url || !body.title) { alert('链接和标题是必填的'); return; }\n  const r = await api('/api/add-manual', 'POST', body);\n  if (r.ok) { ['mUrl','mTitle','mImage','mPrice','mBedrooms','mBeds','mBaths','mSleeps','mNote'].forEach(id => $('#'+id).value=''); $('#manualBox').open = false; await refresh(); }\n  else alert('添加失败：' + (r.error || ''));\n};\n\ndocument.querySelectorAll('.filter-chip').forEach(b => b.onclick = () => {\n  document.querySelectorAll('.filter-chip').forEach(x => x.classList.remove('active'));\n  b.classList.add('active'); filter = b.dataset.f; render();\n});\n$('#sortSel').onchange = e => { sortBy = e.target.value; render(); };\n\nrefresh();\n</script>\n</body>\n</html>\n";
// Cloudflare Worker: Thanksgiving Denver trip — shared Airbnb shortlist + voting
// Static frontend is served from ./public via [assets]; API routes handled here.
// KV binding: VOTES_KV

const KV_KEY = 'state:v1';

// ---- Seed listings (verified 2026-09-30, 10 adults, Nov 25–29, totals incl. fees) ----
// image fields filled from og:image scrape where available; the rest lazy-enrich
// at runtime via /api/enrich.
const SEED = [
  { roomId: '1227535448419064801', url: 'https://www.airbnb.com/rooms/1227535448419064801?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Vista View Cottage', area: '落基山 · Estes Park', priceUSD: 1907, sleeps: 12, bedrooms: 4, beds: 5, bathrooms: 2.5,
    rating: 4.94, reviews: 18, image: 'https://a0.muscache.com/im/pictures/miso/Hosting-1227535448419064801/original/4d15e476-8a5a-4814-8731-a3463dd395b2.png', note: '环绕露台看山景，离公园近' },
  { roomId: '292274', url: 'https://www.airbnb.com/rooms/292274?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Brown Cabin: Charming Mountain House w/Views', area: '落基山 · Estes Park', priceUSD: 2089, sleeps: 12, bedrooms: 4, beds: 7, bathrooms: 2,
    rating: 4.8, reviews: 340, image: 'https://a0.muscache.com/im/pictures/fe7217ff-0b24-438d-880d-b94722c75bf5.jpg?im_w=1200', note: '1931年老木屋，大石壁炉，步行20分钟到公园' },
  { roomId: '8740974', url: 'https://www.airbnb.com/rooms/8740974?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Skyline - Michener House in the Sky', area: '落基山 · Estes Park', priceUSD: 2200, sleeps: 10, bedrooms: 5, beds: 6, bathrooms: 2,
    rating: 4.93, reviews: 131, image: 'https://a0.muscache.com/im/pictures/111377994/8f520b2f_original.jpg', note: '紧邻公园，大厨房+火坑露台' },
  { roomId: '1658870700646985100', url: 'https://www.airbnb.com/rooms/1658870700646985100?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: "Rocky's Riverside Retreat", area: '落基山 · Estes Park', priceUSD: 2402, sleeps: 10, bedrooms: 4, beds: 7, bathrooms: 2,
    rating: 4.67, reviews: 12, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1658870700646985100/original/37d44665-ba6f-4e75-969f-9208f3e4866b.jpeg', note: '临 Fall River，河畔露台+烧烤' },
  { roomId: '724385787075754980', url: 'https://www.airbnb.com/rooms/724385787075754980?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Fall River Oasis · Private Hot Tub · RMNP', area: '落基山 · Estes Park', priceUSD: 2492, sleeps: 10, bedrooms: 4, beds: 5, bathrooms: 2.5,
    rating: 4.73, reviews: 15, image: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-724385787075754980/original/1dca8f7c-ba03-426e-852a-9165d7bf95a9.jpeg', note: '私家6人热水浴缸，全年可用' },
  { roomId: '39392880', url: 'https://www.airbnb.com/rooms/39392880?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Three Bedroom Cabin - Perfect Your Family', area: '落基山 · Estes Park', priceUSD: 2662, sleeps: 10, bedrooms: 3, beds: 5, bathrooms: 2,
    rating: 4.86, reviews: 71, image: 'https://a0.muscache.com/im/pictures/prohost-api/Hosting-39392880/original/01137add-633b-45ca-9fdb-84457f67255b.jpeg', note: '私家热水浴缸看山景，烧柴壁炉' },
  { roomId: '1555270180265800861', url: 'https://www.airbnb.com/rooms/1555270180265800861?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Charming Rustic Cozy Casita Near Sand Dunes', area: '大沙丘区域', priceUSD: 907, sleeps: 10, bedrooms: 2, beds: 10, bathrooms: 1,
    rating: 5.0, reviews: 9, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1555270180265800861/original/47c78951-0836-4300-89a9-c5012216b6e2.jpeg', note: '乡村小木屋，烧烤 patio，最便宜' },
  { roomId: '1645317208833417440', url: 'https://www.airbnb.com/rooms/1645317208833417440?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Vintage home with space to entertain', area: '大沙丘区域', priceUSD: 1140, sleeps: 11, bedrooms: 4, beds: 5, bathrooms: 2,
    rating: 5.0, reviews: 3, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1645317208833417440/original/8928aa7c-1af3-4409-8e26-b405ee471428.jpeg', note: '私家6人热水浴缸+台球桌' },
  { roomId: '1460891336891261388', url: 'https://www.airbnb.com/rooms/1460891336891261388?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Celestial Lodge: Stargazing, Pet Friendly & Groups', area: '大沙丘区域', priceUSD: 1228, sleeps: 14, bedrooms: 3, beds: 10, bathrooms: 2,
    rating: 4.73, reviews: 26, image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1460891336891261388/original/93e2f782-f070-4ad2-b440-66b97c3525de.png', note: '暗夜观星平台，离沙丘近' },
  { roomId: '51935947', url: 'https://www.airbnb.com/rooms/51935947?adults=10&check_in=2026-11-25&check_out=2026-11-29',
    title: 'Beautiful Retreat ~ Multi Family w/ Creek Access', area: '大沙丘区域', priceUSD: 1310, sleeps: 13, bedrooms: 5, beds: 10, bathrooms: 2,
    rating: 5.0, reviews: 10, image: 'https://a0.muscache.com/im/pictures/5f090ddb-2bc0-4b1a-bf9f-29b815cc1f34.jpg', note: '小溪+大火坑，Sangre de Cristo 山景' },
];

// ---------- helpers ----------
const j = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function getMeta(html, prop) {
  const m = html.match(new RegExp('<meta[^>]+property=["\']' + prop + '["\'][^>]*content=["\']([^"\']+)["\']', 'i'))
       || html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']' + prop + '["\']', 'i'));
  return m ? m[1] : '';
}
// Listing photos, in Airbnb's gallery order. Skips platform icons and user avatars.
const MAX_IMAGES = 10;
function collectImages(urls, cover) {
  const out = [];
  const seen = new Set();
  for (const raw of [cover, ...urls]) {
    if (!raw || !/^https:\/\/a0\.muscache\.com\/im\/pictures\//.test(raw)) continue;
    if (/AirbnbPlatformAssets|airbnb-platform-assets|\/user\//i.test(raw)) continue;
    const base = raw.split('?')[0];
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(base + '?im_w=720');
    if (out.length >= MAX_IMAGES) break;
  }
  return out;
}

function numRe(html, re) { const m = html.match(re); return m ? parseFloat(m[1]) : null; }

const SCRAPE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchTextTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: {
      'User-Agent': SCRAPE_UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; }
  finally { clearTimeout(t); }
}

function parseTitleTag(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  if (!m) return '';
  const t = m[1].split(' - ')[0].trim();
  return (/^airbnb$/i.test(t) || t.length < 4) ? '' : t;
}
function parseRating(s) {
  const m = String(s || '').match(/★\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}
// More robust: Airbnb embeds aggregateRating in JSON-LD, e.g.
// "aggregateRating":{"@type":"AggregateRating","ratingValue":4.88,"ratingCount":"72"}
function parseJsonLd(html) {
  const m = html.match(/"aggregateRating"\s*:\s*\{[^}]*?"ratingValue"\s*:\s*([\d.]+)/);
  const c = html.match(/"aggregateRating"\s*:\s*\{[^}]*?"ratingCount"\s*:\s*"(\d+)"/);
  return { rating: m ? parseFloat(m[1]) : null, reviews: c ? parseInt(c[1], 10) : null };
}

// Direct scrape of the Airbnb page. Returns null when blocked or unparsable.
function parseDirect(html) {
  if (!html || html.length < 20000) return null;
  const ogTitle = getMeta(html, 'og:title');
  let title = parseTitleTag(html);
  if (!title && ogTitle) title = ogTitle.split('·')[0].trim();
  const ld = parseJsonLd(html);
  const rating = parseRating(ogTitle) || parseRating(html) || ld.rating;
  const image = getMeta(html, 'og:image') || getMeta(html, 'twitter:image') || '';
  const bedrooms = numRe(html, /(\d+)\s*bedrooms?/i);
  const bathrooms = numRe(html, /(\d+(?:\.\d+)?)\s*bath(?:s|rooms?)?/i);
  const beds = numRe(html, /(\d+)\s*beds(?![a-z])/i);
  const guests = numRe(html, /(\d+)\s*guests/i);
  if (!title && !image && bedrooms == null) return null;
  const images = collectImages([...html.matchAll(/"baseUrl":"(https:\/\/a0\.muscache\.com\/[^"]+)"/g)].map(m => m[1]), image);
  return { ok: true, title, image, images, bedrooms, bathrooms, beds, guests, rating, reviews: ld.reviews };
}

// Fallback: Airbnb often blocks datacenter IPs, so read the page through
// the jina reader proxy and parse its markdown instead.
async function parseViaReader(url) {
  const roomId = roomIdFrom(url);
  if (!roomId) return null;
  const md = await fetchTextTimeout('https://r.jina.ai/https://www.airbnb.com/rooms/' + roomId, 15000);
  if (!md || md.length < 1000 || md.includes('Failed to goto')) return null;
  const h1 = md.match(/^# (.+)$/m);
  const title = h1 ? h1[1].trim() : '';
  const imgM = md.match(/!\[[^\]]*\]\((https:\/\/a0\.muscache\.com\/[^)]*?\/Hosting-[^)]+?)\)/);
  const image = imgM ? imgM[1] : '';
  if (!title && !image) return null;
  const images = collectImages([...md.matchAll(/!\[[^\]]*\]\((https:\/\/a0\.muscache\.com\/[^)]*?\/Hosting-[^)]+?)\)/g)].map(m => m[1]), image);
  return { ok: true, title,
    image, images,
    bedrooms: numRe(md, /(\d+)\s*bedrooms?/i),
    bathrooms: numRe(md, /(\d+(?:\.\d+)?)\s*baths?/i),
    beds: numRe(md, /(\d+)\s*beds(?![a-z])/i),
    guests: numRe(md, /(\d+)\s*guests/i),
    rating: parseRating(md) };
}

async function fetchListingInfo(url) {
  const roomId = roomIdFrom(url);
  const candidates = [url];
  // Airbnb serves bot-wall interstitials on .com for some egress IPs but
  // serves the real page on .co.uk — try both before falling back.
  if (roomId && !/airbnb\.co\.uk/i.test(url)) {
    candidates.push('https://www.airbnb.co.uk/rooms/' + roomId);
  }
  for (const u of candidates) {
    const html = await fetchTextTimeout(u, 10000);
    const direct = parseDirect(html);
    if (direct) return direct;
  }
  const via = await parseViaReader(url);
  if (via) return via;
  return { ok: false };
}

function roomIdFrom(url) {
  const m = String(url || '').match(/airbnb\.[a-z.]+\/rooms\/(\d+)/i);
  return m ? m[1] : null;
}

async function getState(env) {
  const raw = await env.VOTES_KV.get(KV_KEY);
  if (raw) return JSON.parse(raw);
  const state = { listings: SEED.map(s => ({ id: uid(), ...s, addedBy: 'Ken', createdAt: Date.now(), votes: [] })), updatedAt: Date.now() };
  await env.VOTES_KV.put(KV_KEY, JSON.stringify(state));
  return state;
}
async function saveState(env, state) {
  state.updatedAt = Date.now();
  await env.VOTES_KV.put(KV_KEY, JSON.stringify(state));
}

// ---------- route handlers ----------
async function handleAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const url = String(body.url || '').trim();
  const roomId = roomIdFrom(url);
  if (!roomId) return j({ ok: false, error: '看起来不是 Airbnb 房源链接（需要形如 airbnb.com/rooms/123… 的链接）' });
  const state = await getState(env);
  const existing = state.listings.find(l => l.roomId === roomId);
  if (existing) return j({ ok: true, listing: existing, deduped: true });
  const info = await fetchListingInfo(url);
  const listing = {
    id: uid(), roomId, url,
    title: (info.title || '').slice(0, 120) || '未命名房源',
    image: info.image || '', images: info.images || [], area: '', priceUSD: null,
    sleeps: info.guests || null, bedrooms: info.bedrooms, beds: info.beds, bathrooms: info.bathrooms,
    rating: info.rating || null, reviews: info.reviews || null, note: '', addedBy: '', createdAt: Date.now(), votes: []
  };
  state.listings.unshift(listing);
  await saveState(env, state);
  return j({ ok: true, listing, fetched: info.ok });
}

async function handleAddManual(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const url = String(body.url || '').trim();
  const title = String(body.title || '').trim().slice(0, 120);
  const roomId = roomIdFrom(url);
  if (!roomId || !title) return j({ ok: false, error: '链接和标题是必填的' });
  const state = await getState(env);
  if (state.listings.find(l => l.roomId === roomId)) return j({ ok: false, error: '这间已经在清单里了' });
  const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v);
  const listing = { id: uid(), roomId, url, title,
    image: String(body.image || '').trim().slice(0, 500), area: String(body.area || '').slice(0, 40),
    priceUSD: num(body.priceUSD), sleeps: num(body.sleeps), bedrooms: num(body.bedrooms),
    beds: num(body.beds), bathrooms: num(body.bathrooms),
    rating: null, reviews: null, note: String(body.note || '').slice(0, 200),
    addedBy: '', createdAt: Date.now(), votes: [] };
  state.listings.unshift(listing);
  await saveState(env, state);
  return j({ ok: true, listing });
}

async function handleVote(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { id, token, name } = body;
  if (!id || !token) return j({ ok: false, error: '缺少参数' });
  const state = await getState(env);
  const listing = state.listings.find(l => l.id === id);
  if (!listing) return j({ ok: false, error: '房源不存在' });
  listing.votes = (listing.votes || []).filter(v => v.token !== token);
  let voted = false;
  if (name) {
    listing.votes.push({ token: String(token).slice(0, 80), name: String(name).slice(0, 20), at: Date.now() });
    voted = true;
  }
  await saveState(env, state);
  return j({ ok: true, votes: listing.votes, voted });
}

async function handleRemove(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const state = await getState(env);
  const i = state.listings.findIndex(l => l.id === body.id);
  if (i < 0) return j({ ok: false, error: '房源不存在' });
  state.listings.splice(i, 1);
  await saveState(env, state);
  return j({ ok: true });
}

async function handleEnrich(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const state = await getState(env);
  const listing = state.listings.find(l => l.id === body.id);
  if (!listing) return j({ ok: false });
  const info = await fetchListingInfo(listing.url);
  if (!info.ok) return j({ ok: false });
  if ((!listing.title || listing.title === '未命名房源') && info.title) listing.title = info.title.slice(0, 120);
  if (!listing.image && info.image) listing.image = info.image;
  if ((info.images || []).length > (listing.images || []).length) listing.images = info.images;
  if (listing.bedrooms == null && info.bedrooms != null) listing.bedrooms = info.bedrooms;
  if (listing.bathrooms == null && info.bathrooms != null) listing.bathrooms = info.bathrooms;
  if (listing.beds == null && info.beds != null) listing.beds = info.beds;
  if (listing.sleeps == null && info.guests != null) listing.sleeps = info.guests;
  if (listing.rating == null && info.rating != null) listing.rating = info.rating;
  if (listing.reviews == null && info.reviews != null) listing.reviews = info.reviews;
  await saveState(env, state);
  return j({ ok: true, listing });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === '/api/state' && request.method === 'GET') return j(await getState(env));
    if (p === '/api/add' && request.method === 'POST') return handleAdd(request, env);
    if (p === '/api/add-manual' && request.method === 'POST') return handleAddManual(request, env);
    if (p === '/api/vote' && request.method === 'POST') return handleVote(request, env);
    if (p === '/api/remove' && request.method === 'POST') return handleRemove(request, env);
    if (p === '/api/enrich' && request.method === 'POST') return handleEnrich(request, env);
    return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};
