const PAGE = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Denver 感恩节之旅 · 选房 + 分账</title>\n<script>\n  // 每个浏览器会话第一次打开时播放开场动画；先在 <html> 上打标记，避免页面先闪一下\n  try { if (!sessionStorage.getItem('splashSeen')) document.documentElement.classList.add('splash', 'splash-lock'); } catch(e) {}\n</script>\n<script src=\"https://cdn.tailwindcss.com\"></script>\n<script src=\"https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js\"></script>\n<link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\">\n<script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script>\n<style>\n  body { font-family: -apple-system, \"PingFang SC\", \"Microsoft YaHei\", sans-serif; }\n  .card-img { aspect-ratio: 16/10; object-fit: cover; }\n  .chip { display:inline-block; background:#eef2ff; color:#4f46e5; font-size:12px; padding:2px 8px; border-radius:9999px; margin:2px 2px 0 0; }\n  .filter-chip { cursor:pointer; }\n  .filter-chip.active { background:#4f46e5; color:#fff; }\n  #nameModal { display:none; }\n  #nameModal.open { display:flex; }\n  .vote-btn.voted { background:#e11d48 !important; color:#fff !important; border-color:#e11d48 !important; }\n  .carousel { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; overscroll-behavior-x:contain; }\n  .carousel::-webkit-scrollbar { display:none; }\n  .carousel > img { flex:0 0 100%; width:100%; scroll-snap-align:start; }\n  .car-dots { position:absolute; left:0; right:0; bottom:10px; display:flex; justify-content:center; gap:6px; pointer-events:none; }\n  .car-dots button { width:7px; height:7px; border-radius:9999px; background:rgba(255,255,255,.55); box-shadow:0 0 2px rgba(0,0,0,.4); pointer-events:auto; transition:transform .2s, background .2s; }\n  .car-dots button.on { background:#fff; transform:scale(1.3); }\n  .car-arrow { position:absolute; top:50%; transform:translateY(-50%); width:30px; height:30px; border-radius:9999px; background:rgba(255,255,255,.9); color:#334155; font-size:18px; line-height:30px; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,.25); opacity:0; transition:opacity .2s; }\n  .car-wrap:hover .car-arrow:not([disabled]) { opacity:1; }\n  .car-arrow[disabled] { visibility:hidden; }\n  @media (hover:none) { .car-arrow { display:none; } }\n  /* 地图：自成一个层叠上下文，免得 Leaflet 的高 z-index 盖住弹窗和底栏 */\n  #mapBox { position:relative; z-index:0; isolation:isolate; }\n  #map { height:340px; }\n  @media (min-width:768px) { #map { height:420px; } }\n  .pin-wrap { background:none; border:none; }\n  .osm-tiles { filter: saturate(.75) contrast(.95) brightness(1.03); } /* 柔和一点，让价格钉更显眼 */\n  .pin { position:absolute; left:0; bottom:0; transform:translate(-50%, -6px); white-space:nowrap; background:#fff; color:#0f172a; font-weight:800; font-size:12px; padding:4px 9px; border-radius:9999px; box-shadow:0 2px 8px rgba(15,23,42,.28); transition: transform .15s, background .15s, color .15s; cursor:pointer; }\n  .pin::after { content:''; position:absolute; left:50%; bottom:-5px; transform:translateX(-50%); border:5px solid transparent; border-bottom:0; border-top-color:inherit; }\n  .pin { border-top-color:#fff; }\n  .pin .pin-votes { color:#e11d48; font-weight:700; margin-left:4px; }\n  .pin.mine { background:#e11d48; color:#fff; border-top-color:#e11d48; }\n  .pin.mine .pin-votes { color:#ffe4e6; }\n  .pin.hot, .pin:hover { background:#1e1b4b; color:#fff; border-top-color:#1e1b4b; transform:translate(-50%, -6px) scale(1.12); z-index:1000; }\n  .pin.hot .pin-votes, .pin:hover .pin-votes { color:#f9a8d4; }\n  .leaflet-popup-content-wrapper { border-radius:16px; padding:0; overflow:hidden; }\n  .leaflet-popup-content { margin:0; width:230px !important; }\n  .flash { animation: flash 1.4s ease; }\n  @keyframes flash { 0%,100% { box-shadow: 0 1px 3px rgba(0,0,0,.1); } 30% { box-shadow: 0 0 0 4px #818cf8, 0 12px 30px -6px rgba(79,70,229,.45); } }\n  .just-voted { box-shadow: 0 0 0 3px #fb7185, 0 10px 25px -5px rgba(225,29,72,.35); transition: box-shadow .6s ease; }\n  .avatar { display:grid; place-items:center; border-radius:9999px; font-weight:800; color:#fff; background:linear-gradient(135deg,#6366f1,#ec4899); }\n  #accountBtn { position:fixed; z-index:45; top:calc(env(safe-area-inset-top, 0px) + 14px); right:16px; }\n  @media (max-width: 767px) { header h1 { padding-right: 6rem; } }\n  .trip-tab { background:rgba(255,255,255,.15); color:#fff; }\n  .trip-tab:hover { background:rgba(255,255,255,.28); }\n  .trip-tab.active { background:#fff; color:#4f46e5; box-shadow:0 4px 14px rgba(0,0,0,.15); }\n  #toast { position:fixed; left:50%; top:24px; z-index:70; pointer-events:none; opacity:0; transform:translate(-50%,-16px) scale(.9);\n    transition: opacity .3s ease, transform .45s cubic-bezier(.2,1.6,.4,1); }\n  #toast.show { opacity:1; transform:translate(-50%,0) scale(1); }\n  @keyframes vote-pop { 0% { transform:scale(1); } 35% { transform:scale(1.12); } 100% { transform:scale(1); } }\n  .vote-pop { animation: vote-pop .45s ease; }\n\n  /* 左侧导航 */\n  #sidebar { background: radial-gradient(120% 60% at 0% 0%, rgba(236,72,153,.35), transparent 60%), linear-gradient(180deg, #1e1b4b 0%, #312e81 55%, #4c1d95 100%); }\n  .nav-item { position:relative; display:flex; align-items:center; gap:.85rem; width:100%; padding:.8rem 1rem; border-radius:1rem; color:rgba(224,231,255,.75); text-align:left; transition: background .2s, color .2s, transform .2s; }\n  .nav-item:hover { background:rgba(255,255,255,.08); color:#fff; }\n  .nav-item .nav-ico { display:grid; place-items:center; width:2.4rem; height:2.4rem; border-radius:.8rem; background:rgba(255,255,255,.08); font-size:1.15rem; transition: background .2s, transform .2s; }\n  .nav-item:hover .nav-ico { transform: rotate(-6deg) scale(1.06); }\n  .nav-item.active { background:#fff; color:#1e1b4b; box-shadow:0 10px 30px -8px rgba(0,0,0,.45); }\n  .nav-item.active .nav-ico { background:linear-gradient(135deg,#6366f1,#ec4899); }\n  .nav-item.active::before { content:''; position:absolute; left:-1rem; top:22%; bottom:22%; width:4px; border-radius:0 4px 4px 0; background:linear-gradient(#a5b4fc,#f9a8d4); }\n  .nav-sub { display:block; font-size:.72rem; font-weight:500; opacity:.65; }\n  /* 手机上变成底部标签栏 */\n  #bottomNav { padding-bottom: env(safe-area-inset-bottom, 0px); }\n  .bnav-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; padding:.55rem 0 .5rem; font-size:.72rem; font-weight:600; color:#64748b; }\n  .bnav-item .nav-ico { font-size:1.3rem; transition: transform .2s; }\n  .bnav-item.active { color:#4f46e5; }\n  .bnav-item.active .nav-ico { transform: translateY(-2px) scale(1.12); }\n  .view-enter { animation: view-in .35s ease; }\n  @keyframes view-in { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }\n  @media (prefers-reduced-motion: reduce) { .view-enter { animation:none; } }\n\n  /* ---------- 开场动画 ---------- */\n  #splash { display:none; }\n  html.splash #splash { display:flex; }\n  html.splash-lock body { overflow:hidden; }\n  #splash { position:fixed; inset:0; z-index:100; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; color:#fff; text-align:center;\n    background: radial-gradient(90% 60% at 80% 10%, rgba(236,72,153,.45), transparent 60%), radial-gradient(70% 50% at 10% 20%, rgba(99,102,241,.5), transparent 60%), linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);\n    transition: transform .8s cubic-bezier(.7,0,.2,1), opacity .8s ease; }\n  #splash.leave { transform: translateY(-100%); }\n  #splash .sp-sun { position:absolute; width:min(46vw,340px); aspect-ratio:1; border-radius:50%; bottom:18%; background:radial-gradient(circle, #fde68a 0%, #fb923c 55%, rgba(251,146,60,0) 70%); filter: blur(2px); opacity:0; animation: sp-sun 1.6s .1s ease-out forwards; }\n  #splash .sp-mtn { position:absolute; left:0; right:0; bottom:0; width:100%; height:auto; transform: translateY(100%); animation: sp-rise 1.1s cubic-bezier(.2,.8,.2,1) forwards; }\n  #splash .sp-mtn.m1 { animation-delay:.05s; } #splash .sp-mtn.m2 { animation-delay:.2s; } #splash .sp-mtn.m3 { animation-delay:.35s; }\n  #splash .sp-content { position:relative; z-index:2; margin-bottom:12vh; padding:0 24px; }\n  #splash .sp-turkey { font-size:clamp(56px, 12vw, 96px); display:inline-block; opacity:0; animation: sp-drop .9s .45s cubic-bezier(.3,1.6,.5,1) forwards; }\n  #splash .sp-title { font-weight:900; font-size:clamp(30px, 7vw, 64px); letter-spacing:.02em; margin-top:8px; text-shadow:0 6px 30px rgba(0,0,0,.35); }\n  #splash .sp-title span { display:inline-block; opacity:0; transform: translateY(24px) rotate(6deg); animation: sp-letter .6s cubic-bezier(.2,.9,.3,1.2) forwards; white-space:pre; }\n  #splash .sp-sub { margin-top:10px; font-size:clamp(13px, 2.6vw, 18px); color:#e0e7ff; opacity:0; animation: sp-fade .7s 1.35s ease forwards; }\n  #splash .sp-bar { width:140px; height:3px; border-radius:3px; background:rgba(255,255,255,.18); margin:22px auto 0; overflow:hidden; opacity:0; animation: sp-fade .4s 1.5s ease forwards; }\n  #splash .sp-bar i { display:block; height:100%; width:100%; background:linear-gradient(90deg,#a5b4fc,#f9a8d4); transform-origin:left; transform:scaleX(0); animation: sp-load 1.1s 1.55s ease-in-out forwards; }\n  #splash .sp-skip { position:absolute; z-index:3; right:18px; bottom:calc(env(safe-area-inset-bottom, 0px) + 16px); font-size:12px; color:rgba(255,255,255,.65); }\n  #splash .sp-leaf { position:absolute; top:-8vh; z-index:1; font-size:22px; opacity:0; animation: sp-leaf linear forwards; }\n  @media (max-width: 640px) { #splash .sp-snow { display:none; } } /* 窄屏上 SVG 被横向压扁，雪顶会变形 */\n  @keyframes sp-rise { to { transform: translateY(0); } }\n  @keyframes sp-sun { 0% { opacity:0; transform: translateY(40%) scale(.8); } 100% { opacity:.9; transform: translateY(0) scale(1); } }\n  @keyframes sp-drop { 0% { opacity:0; transform: translateY(-80px) scale(.6) rotate(-20deg); } 100% { opacity:1; transform: none; } }\n  @keyframes sp-letter { to { opacity:1; transform:none; } }\n  @keyframes sp-fade { to { opacity:1; } }\n  @keyframes sp-load { to { transform:scaleX(1); } }\n  @keyframes sp-leaf { 0% { opacity:0; transform: translate(0,0) rotate(0); } 10% { opacity:.95; } 100% { opacity:.9; transform: translate(var(--dx), 115vh) rotate(var(--rot)); } }\n  @media (prefers-reduced-motion: reduce) {\n    #splash, #splash * { animation-duration:.01s !important; animation-delay:0s !important; }\n    #splash { transition: opacity .4s ease; }\n    #splash.leave { transform:none; opacity:0; }\n    #splash .sp-leaf { display:none; }\n  }\n</style>\n</head>\n<body class=\"bg-slate-100 min-h-screen md:flex\">\n\n<!-- 开场动画（每个会话一次，点一下可跳过） -->\n<div id=\"splash\" role=\"presentation\" aria-hidden=\"true\">\n  <div class=\"sp-sun\"></div>\n  <svg class=\"sp-mtn m1\" viewBox=\"0 0 1440 360\" preserveAspectRatio=\"none\" style=\"height:46vh\"><path fill=\"#6d28d9\" fill-opacity=\".55\" d=\"M0 250 L120 170 L230 220 L360 110 L470 190 L600 90 L720 180 L840 70 L980 200 L1100 120 L1220 190 L1340 100 L1440 160 L1440 360 L0 360Z\"/></svg>\n  <svg class=\"sp-mtn m2\" viewBox=\"0 0 1440 360\" preserveAspectRatio=\"none\" style=\"height:36vh\"><path fill=\"#4c1d95\" d=\"M0 280 L150 190 L260 250 L400 150 L520 230 L660 140 L800 240 L930 160 L1060 250 L1190 170 L1320 240 L1440 200 L1440 360 L0 360Z\"/><path class=\"sp-snow\" fill=\"#fff\" fill-opacity=\".85\" d=\"M400 150 L372 168 L392 166 L404 178 L418 164 L432 172Z M660 140 L630 160 L652 158 L664 170 L678 156 L694 164Z M930 160 L902 178 L922 176 L934 188 L948 174 L962 180Z M1190 170 L1164 186 L1182 184 L1194 196 L1206 182 L1220 188Z\"/></svg>\n  <svg class=\"sp-mtn m3\" viewBox=\"0 0 1440 360\" preserveAspectRatio=\"none\" style=\"height:24vh\"><path fill=\"#1e1b4b\" d=\"M0 300 L90 250 L200 290 L320 230 L430 280 L560 220 L700 290 L820 240 L960 300 L1080 250 L1210 290 L1330 240 L1440 270 L1440 360 L0 360Z\"/></svg>\n  <div class=\"sp-content\">\n    <div class=\"sp-turkey\">🦃</div>\n    <div class=\"sp-title\" id=\"spTitle\">Denver 感恩节之旅</div>\n    <div class=\"sp-sub\">11月25–29 · 选房 · 投票 · 分账 · 大家一起</div>\n    <div class=\"sp-bar\"><i></i></div>\n  </div>\n  <div class=\"sp-skip\">点击任意处跳过</div>\n</div>\n<script>\n// 开场动画：逐字出现的标题 + 飘落的枫叶，播完（或被点掉）后整块往上收走\nconst splashDone = new Promise(resolve => {\n  const el = document.getElementById('splash');\n  if (!document.documentElement.classList.contains('splash')) { el.remove(); resolve(); return; }\n  try { sessionStorage.setItem('splashSeen', '1'); } catch(e) {}\n  const t = document.getElementById('spTitle');\n  t.innerHTML = Array.from(t.textContent).map((c, i) => '<span style=\"animation-delay:' + (0.7 + i * 0.06).toFixed(2) + 's\">' + c + '</span>').join('');\n  ['🍁', '🍂', '🍁', '🍂', '🍁', '🍂', '🍁', '🍂', '🍁', '🍂'].forEach((leaf, i) => {\n    const s = document.createElement('span');\n    s.className = 'sp-leaf'; s.textContent = leaf;\n    s.style.left = (5 + Math.random() * 90) + '%';\n    s.style.fontSize = (16 + Math.random() * 18) + 'px';\n    s.style.animationDuration = (3 + Math.random() * 2.5) + 's';\n    s.style.animationDelay = (Math.random() * 1.8) + 's';\n    s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');\n    s.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');\n    el.appendChild(s);\n  });\n  let gone = false;\n  function leave(){\n    if (gone) return; gone = true;\n    el.classList.add('leave');\n    document.documentElement.classList.remove('splash-lock'); // 恢复页面滚动\n    setTimeout(() => { el.remove(); document.documentElement.classList.remove('splash'); }, 850);\n    setTimeout(resolve, 450); // 幕布收到一半就可以弹登录框了\n    removeEventListener('keydown', leave);\n  }\n  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;\n  setTimeout(leave, reduce ? 700 : 2900);\n  el.addEventListener('click', leave);\n  addEventListener('keydown', leave);\n});\n</script>\n\n<!-- 左侧导航（md 以上） -->\n<aside id=\"sidebar\" class=\"hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 text-white px-4 py-6\">\n  <div class=\"px-2 mb-8\">\n    <div class=\"text-3xl mb-2\">🦃</div>\n    <div class=\"font-extrabold text-lg leading-tight\">Denver 感恩节之旅</div>\n    <div class=\"text-xs text-indigo-200 mt-1\">Thanksgiving 2026 · 大家一起</div>\n  </div>\n  <nav class=\"flex flex-col gap-2\" aria-label=\"主导航\">\n    <button data-view=\"hunt\" class=\"nav-item\"><span class=\"nav-ico\">🏠</span><span class=\"font-bold\">AirBnb hunting<span class=\"nav-sub\">一起选房 · 投票</span></span></button>\n    <button data-view=\"split\" class=\"nav-item\"><span class=\"nav-ico\">💰</span><span class=\"font-bold\">Split that bill<span class=\"nav-sub\">分账 · 谁该给谁</span></span></button>\n  </nav>\n  <p class=\"mt-auto px-2 text-xs text-indigo-200/80 leading-relaxed\">有链接的人都能加房源、投票、记账 · 数据实时共享</p>\n</aside>\n\n<!-- 手机底部标签栏 -->\n<nav id=\"bottomNav\" class=\"md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 flex\" aria-label=\"主导航\">\n  <button data-view=\"hunt\" class=\"bnav-item\"><span class=\"nav-ico\">🏠</span>AirBnb hunting</button>\n  <button data-view=\"split\" class=\"bnav-item\"><span class=\"nav-ico\">💰</span>Split that bill</button>\n</nav>\n\n<div class=\"flex-1 min-w-0 pb-20 md:pb-0\">\n<header class=\"bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white px-6 py-8\">\n  <div class=\"max-w-6xl mx-auto\">\n    <h1 id=\"viewTitle\" class=\"text-2xl md:text-3xl font-bold\">&nbsp;</h1>\n    <p id=\"tripSub\" class=\"mt-2 text-indigo-100\">&nbsp;</p>\n    <nav id=\"tabs\" class=\"mt-5 flex flex-wrap gap-2\"></nav>\n  </div>\n</header>\n\n<main class=\"max-w-6xl mx-auto px-4 py-6\">\n\n  <div id=\"view-hunt\">\n  <!-- 加房源 -->\n  <section class=\"bg-white rounded-2xl shadow p-5 mb-6\">\n    <h2 class=\"font-bold text-lg mb-3\">➕ 添加候选房源</h2>\n    <div class=\"flex flex-col md:flex-row gap-3\">\n      <input id=\"urlInput\" type=\"url\" placeholder=\"粘贴 Airbnb 房源链接，例如 https://www.airbnb.com/rooms/123456…\"\n        class=\"flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500\">\n      <button id=\"addBtn\" class=\"bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-3\">加入清单</button>\n    </div>\n    <p id=\"addMsg\" class=\"text-sm mt-2 text-slate-500\"></p>\n    <details id=\"manualBox\" class=\"mt-3 text-sm\">\n      <summary class=\"cursor-pointer text-indigo-600 font-medium\">自动抓取失败？点这里手动添加</summary>\n      <div class=\"grid md:grid-cols-2 gap-3 mt-3\">\n        <input id=\"mUrl\" class=\"border rounded-lg px-3 py-2\" placeholder=\"房源链接 *\">\n        <input id=\"mTitle\" class=\"border rounded-lg px-3 py-2\" placeholder=\"房源标题 *\">\n        <input id=\"mImage\" class=\"border rounded-lg px-3 py-2\" placeholder=\"照片链接（可选）\">\n        <input id=\"mPrice\" class=\"border rounded-lg px-3 py-2\" type=\"number\" placeholder=\"总价 USD（可选）\">\n        <input id=\"mBedrooms\" class=\"border rounded-lg px-3 py-2\" type=\"number\" placeholder=\"卧室数\">\n        <input id=\"mBeds\" class=\"border rounded-lg px-3 py-2\" type=\"number\" placeholder=\"床位数\">\n        <input id=\"mBaths\" class=\"border rounded-lg px-3 py-2\" placeholder=\"浴室数（可填 2.5）\">\n        <input id=\"mSleeps\" class=\"border rounded-lg px-3 py-2\" type=\"number\" placeholder=\"可住人数\">\n        <select id=\"mArea\" class=\"border rounded-lg px-3 py-2\"></select>\n        <input id=\"mNote\" class=\"border rounded-lg px-3 py-2\" placeholder=\"一句话亮点（可选）\">\n      </div>\n      <button id=\"manualBtn\" class=\"mt-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-5 py-2\">手动加入</button>\n    </details>\n  </section>\n\n  <!-- 工具条 -->\n  <section class=\"flex flex-wrap items-center gap-2 mb-4\">\n    <div id=\"filters\" class=\"contents\"></div>\n    <select id=\"sortSel\" class=\"ml-auto border rounded-full px-4 py-1.5 text-sm bg-white\">\n      <option value=\"votes\">按票数排序</option>\n      <option value=\"price\">按价格从低到高</option>\n      <option value=\"added\">按添加时间（最新在前）</option>\n    </select>\n    <button id=\"mapToggle\" class=\"border rounded-full px-4 py-1.5 text-sm bg-white hover:border-indigo-400\"></button>\n    <span id=\"countLbl\" class=\"text-sm text-slate-500 w-full md:w-auto\"></span>\n  </section>\n\n  <!-- 地图 -->\n  <section id=\"mapBox\" class=\"bg-white rounded-2xl shadow overflow-hidden mb-5\">\n    <div id=\"map\"></div>\n    <div id=\"mapNote\" class=\"absolute left-3 bottom-3 z-[1000] bg-white/90 backdrop-blur text-xs text-slate-600 rounded-full px-3 py-1 shadow\" hidden></div>\n  </section>\n\n  <!-- 列表 -->\n  <section id=\"grid\" class=\"grid md:grid-cols-2 lg:grid-cols-3 gap-5\"></section>\n  </div>\n\n  <!-- 分账 Splitwise -->\n  <div id=\"view-split\" hidden>\n  <section id=\"splitSection\" class=\"bg-white rounded-2xl shadow p-5\">\n    <div class=\"mb-5\">\n      <div class=\"text-sm font-medium mb-2\">成员</div>\n      <div id=\"memberChips\" class=\"mb-2\"></div>\n      <div class=\"flex gap-2\">\n        <input id=\"memberInput\" class=\"border rounded-lg px-3 py-2 flex-1\" placeholder=\"新成员的名字\" maxlength=\"20\">\n        <button id=\"memberBtn\" class=\"bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-4 py-2 text-sm font-bold\">加成员</button>\n      </div>\n    </div>\n    <div class=\"grid md:grid-cols-3 gap-3 mb-3\">\n      <input id=\"eDesc\" class=\"border rounded-lg px-3 py-2\" placeholder=\"支出说明，比如 房费 / 晚餐\">\n      <input id=\"eAmount\" type=\"number\" step=\"0.01\" min=\"0\" class=\"border rounded-lg px-3 py-2\" placeholder=\"金额 USD\">\n      <select id=\"ePaidBy\" class=\"border rounded-lg px-3 py-2\"></select>\n    </div>\n    <div class=\"mb-3\">\n      <div class=\"text-sm font-medium mb-1\">分摊给（默认全选）</div>\n      <div id=\"eSplit\"></div>\n    </div>\n    <button id=\"eAddBtn\" class=\"bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5 py-2\">记一笔</button>\n    <p id=\"eMsg\" class=\"text-sm mt-2 text-slate-500\"></p>\n    <div id=\"balances\" class=\"mt-5\"></div>\n    <div id=\"settlements\" class=\"mt-3\"></div>\n    <div id=\"expenses\" class=\"mt-4\"></div>\n  </section>\n  </div>\n\n  <p class=\"md:hidden text-center text-slate-400 text-sm mt-10 mb-6\">有链接的人都能加房源、投票、记账 · 数据实时共享</p>\n</main>\n</div>\n\n<!-- 名字弹窗 -->\n<!-- 当前用户（点开可以切换） -->\n<button id=\"accountBtn\" class=\"account-btn flex items-center gap-2 rounded-full bg-white/90 backdrop-blur shadow-lg hover:shadow-xl pl-1 pr-3 py-1 text-sm font-medium text-slate-700\"></button>\n\n<!-- 投票成功的庆祝横幅 -->\n<div id=\"toast\" role=\"status\" aria-live=\"polite\" class=\"bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold rounded-full px-6 py-3 shadow-xl max-w-[90vw] truncate\"></div>\n\n<div id=\"nameModal\" class=\"fixed inset-0 bg-black/50 items-center justify-center z-50 px-4\">\n  <div class=\"bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl\">\n    <h3 class=\"font-bold text-lg mb-1\">👋 你是谁？</h3>\n    <p class=\"text-sm text-slate-500 mb-4\">选一下你的名字就能登录，投票和记账都会记在你名下</p>\n    <div id=\"pickBox\">\n      <label class=\"text-sm font-medium\" for=\"userSel\">我来过了</label>\n      <div class=\"flex gap-2 mt-1 mb-4\">\n        <select id=\"userSel\" class=\"flex-1 min-w-0 border rounded-lg px-3 py-2 bg-white\"></select>\n        <button id=\"pickOk\" class=\"bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 font-bold\">登录</button>\n      </div>\n      <div class=\"flex items-center gap-3 text-xs text-slate-400 mb-3\"><span class=\"flex-1 border-t\"></span>第一次来？<span class=\"flex-1 border-t\"></span></div>\n    </div>\n    <div class=\"flex gap-2\">\n      <input id=\"nameInput\" class=\"flex-1 min-w-0 border rounded-lg px-3 py-2\" placeholder=\"输入你的名字，比如 Ken\" maxlength=\"20\">\n      <button id=\"nameOk\" class=\"bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-4 py-2 font-bold\">加入</button>\n    </div>\n    <p id=\"loginMsg\" class=\"text-sm text-rose-600 mt-2\"></p>\n    <button id=\"loginSkip\" class=\"mt-2 text-sm text-slate-400 hover:text-slate-600\">先随便看看 →</button>\n  </div>\n</div>\n\n<script>\nconst $ = s => document.querySelector(s);\n// 两段行程，各自一份候选清单（后端按 trip 分开存）\nconst TRIPS = {\n  nov25: { date: '11月25–26', people: 9, nights: 1, checkIn: '2026-11-25', checkOut: '2026-11-26', areas: ['Denver 市区', 'Denver 周边'] },\n  nov26: { date: '11月26–29', people: 14, nights: 3, checkIn: '2026-11-26', checkOut: '2026-11-29', areas: ['大沙丘区域', '落基山 · Estes Park'] },\n};\nconst [hashTrip, hashView] = location.hash.slice(1).split('/');\nlet trip = TRIPS[hashTrip] ? hashTrip : 'nov25';\n// 左侧导航的两个页面\nconst VIEWS = {\n  hunt:  { title: '🏠 AirBnb hunting · 一起选房', sub: '看中哪间就把 Airbnb 链接贴进来，票数最高的我们就订它' },\n  split: { title: '💰 Split that bill · 分账', sub: '全员一本账 · 共同支出记在这里，自动算清谁该给谁多少钱' },\n};\nlet view = VIEWS[hashView] ? hashView : 'hunt';\nfunction syncHash(){ history.replaceState(null, '', '#' + trip + (view === 'hunt' ? '' : '/' + view)); }\nlet T = TRIPS[trip];\nlet STATE = { listings: [], expenses: [], balances: {}, settlements: [] };\nlet myToken = localStorage.getItem('vt');\nif (!myToken) { myToken = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()); localStorage.setItem('vt', myToken); }\nlet myName = localStorage.getItem('vn') || '';\nlet filter = 'all', sortBy = 'votes';\nlet editingId = null, editDraft = null; // 分账里正在修改的那笔，和它编辑框里还没保存的内容\nlet pendingVoteId = null;\n\nfunction esc(s){ return String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c])); }\nasync function api(path, method, body){\n  const r = await fetch(path, { method: method || 'GET', headers: {'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined });\n  return r.json();\n}\n\nfunction statsLine(l){\n  const parts = [];\n  if (l.bedrooms) parts.push(l.bedrooms + '卧');\n  if (l.beds) parts.push(l.beds + '床');\n  if (l.bathrooms) parts.push(l.bathrooms + '卫');\n  if (l.sleeps) parts.push('可住' + l.sleeps + '人');\n  return parts.length ? parts.join(' · ') : '户型信息待补充';\n}\n\n// 按当前行程的日期和人数打开 Airbnb，直接看到实时总价\nfunction airbnbLink(l){\n  return 'https://www.airbnb.com/rooms/' + l.roomId + '?adults=' + T.people + '&check_in=' + T.checkIn + '&check_out=' + T.checkOut;\n}\n\nfunction card(l){\n  const voted = (l.votes || []).some(v => v.token === myToken);\n  const n = (l.votes || []).length;\n  const voters = (l.votes || []).map(v => '<span class=\"chip\">' + esc(v.name || '匿名') + '</span>').join('');\n  // 早期预置房源没有 priceNights，它们的价格是 11/25–29 的 4 晚总价\n  const price = l.priceUSD ? '<div class=\"text-lg font-bold text-slate-800\">约 $' + Number(l.priceUSD).toLocaleString() + ' <span class=\"text-xs font-normal text-slate-500\">/ ' + (l.priceNights || 4) + '晚含税费</span></div>'\n    : '<div class=\"text-sm text-slate-500\">价格以 Airbnb 页面为准</div>';\n  const tooSmall = l.sleeps && l.sleeps < T.people ? '<p class=\"text-sm text-amber-600 mb-2\">⚠️ 最多住 ' + l.sleeps + ' 人，不够 ' + T.people + ' 人</p>' : '';\n  const rating = l.rating ? '<span class=\"text-sm\">⭐ ' + l.rating + (l.reviews ? '（' + l.reviews + '条评价）' : '') + '</span>' : '';\n  const area = l.area ? '<span class=\"absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full\">' + esc(l.area) + '</span>' : '';\n  const del = '<button onclick=\"removeListing(\\'' + l.id + '\\')\" title=\"删除这个房源\" class=\"absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-full\">✕</button>';\n  const pics = (l.images && l.images.length) ? l.images : (l.image ? [l.image] : []);\n  let img;\n  if (!pics.length) img = '<div class=\"card-img w-full rounded-t-2xl bg-slate-200 flex items-center justify-center text-slate-400 text-4xl\">🏠</div>';\n  else if (pics.length === 1) img = '<img src=\"' + esc(pics[0]) + '\" class=\"card-img w-full rounded-t-2xl\" loading=\"lazy\" alt=\"\">';\n  else img = '<div class=\"carousel rounded-t-2xl\" onscroll=\"carSync(this)\">'\n      + pics.map(u => '<img src=\"' + esc(u) + '\" class=\"card-img\" loading=\"lazy\" alt=\"\">').join('') + '</div>'\n      + '<button class=\"car-arrow left-2\" onclick=\"carStep(this,-1)\" aria-label=\"上一张\" disabled>‹</button>'\n      + '<button class=\"car-arrow right-2\" onclick=\"carStep(this,1)\" aria-label=\"下一张\">›</button>'\n      + '<div class=\"car-dots\">' + pics.map((_, i) => '<button onclick=\"carGo(this,' + i + ')\" aria-label=\"第' + (i + 1) + '张\"' + (i ? '' : ' class=\"on\"') + '></button>').join('') + '</div>';\n  return '<article data-id=\"' + esc(l.id) + '\" class=\"bg-white rounded-2xl shadow overflow-hidden flex flex-col\">'\n    + '<div class=\"relative car-wrap\">' + img + area + del + '</div>'\n    + '<div class=\"p-4 flex flex-col flex-1\">'\n    + '<h3 class=\"font-bold leading-snug mb-1\">' + esc(l.title || '未命名房源') + '</h3>'\n    + '<p class=\"text-sm text-slate-500 mb-2\">' + esc(statsLine(l)) + '</p>'\n    + tooSmall\n    + '<div class=\"mb-1\">' + price + '</div>'\n    + '<div class=\"mb-2\">' + rating + '</div>'\n    + (l.note ? '<p class=\"text-sm text-slate-600 mb-2\">💡 ' + esc(l.note) + '</p>' : '')\n    + (voters ? '<div class=\"mb-3\">' + voters + '</div>' : '<div class=\"mb-3 text-xs text-slate-400\">还没有人投票，来当第一个吧</div>')\n    + '<div class=\"mt-auto flex gap-2\">'\n    + '<button onclick=\"doVote(\\'' + l.id + '\\')\" class=\"vote-btn flex-1 border-2 border-rose-500 text-rose-600 font-bold rounded-xl py-2 ' + (voted ? 'voted' : '') + '\">' + (voted ? '❤️ 已投 · ' : '🤍 投票 · ') + n + '</button>'\n    + '<a href=\"' + esc(airbnbLink(l)) + '\" target=\"_blank\" rel=\"noopener\" title=\"按 ' + T.date + ' · ' + T.people + '人查看实时价格\" class=\"border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400\">去 Airbnb ↗</a>'\n    + '</div>'\n    + '<button onclick=\"splitListing(\\'' + l.id + '\\')\" class=\"mt-2 border-2 border-emerald-100 text-emerald-700 rounded-xl py-1.5 text-sm font-medium hover:border-emerald-400\">💰 用这间分账</button>'\n    + '</div></article>';\n}\n\n// ---- photo carousel ----\nconst slideIdx = {}; // listing id -> current photo, so re-renders keep your place\nfunction carOf(el){ return el.closest('.car-wrap').querySelector('.carousel'); }\nfunction carSync(c){\n  const i = Math.round(c.scrollLeft / c.clientWidth);\n  const wrap = c.closest('.car-wrap');\n  wrap.querySelectorAll('.car-dots button').forEach((d, k) => d.classList.toggle('on', k === i));\n  const [prev, next] = wrap.querySelectorAll('.car-arrow');\n  prev.disabled = i <= 0; next.disabled = i >= c.children.length - 1;\n  const art = c.closest('article'); if (art) slideIdx[art.dataset.id] = i;\n}\nfunction carGo(el, i){ const c = carOf(el); c.scrollTo({ left: i * c.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' }); }\nfunction carStep(el, d){ const c = carOf(el); carGo(el, Math.round(c.scrollLeft / c.clientWidth) + d); }\nfunction restoreSlides(root){\n  root.querySelectorAll('article[data-id] .carousel').forEach(c => {\n    const i = slideIdx[c.closest('article').dataset.id];\n    if (i) { c.scrollLeft = i * c.clientWidth; carSync(c); }\n  });\n}\n\nconst reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\nlet reorderTimer = null;\n\n// ---------- 地图：当前筛选下的房源都钉在上面 ----------\nlet map = null, mapLayer = null, mapKey = '', mapList = [];\nconst pinById = {};\nlet showMap = true;\ntry { showMap = localStorage.getItem('showMap') !== '0'; } catch(e){}\nfunction mapVisible(){ return showMap && view === 'hunt' && window.L; }\nfunction ensureMap(){\n  if (map || !window.L) return map;\n  map = L.map('map', { scrollWheelZoom: false, zoomControl: true, attributionControl: true, zoomSnap: 0.25 });\n  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {\n    maxZoom: 19, className: 'osm-tiles',\n    attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>'\n  }).addTo(map);\n  map.setView([39.2, -105.3], 7); // 科罗拉多中部，等房源坐标来了再缩放\n  map.on('click', () => map.scrollWheelZoom.enable()); // 点一下地图之后才允许滚轮缩放，免得滚页面时误缩放\n  map.on('mouseout', () => map.scrollWheelZoom.disable());\n  mapLayer = L.layerGroup().addTo(map);\n  return map;\n}\nfunction pinHtml(l){\n  const n = (l.votes || []).length;\n  const mine = (l.votes || []).some(v => v.token === myToken);\n  const label = l.priceUSD ? '$' + Number(l.priceUSD).toLocaleString() : '🏠';\n  return '<div class=\"pin' + (mine ? ' mine' : '') + '\" data-id=\"' + esc(l.id) + '\">' + label + (n ? '<span class=\"pin-votes\">♥' + n + '</span>' : '') + '</div>';\n}\nfunction popupHtml(l){\n  const pic = (l.images && l.images[0]) || l.image;\n  const n = (l.votes || []).length;\n  return (pic ? '<img src=\"' + esc(pic) + '\" style=\"width:100%;aspect-ratio:16/10;object-fit:cover\" alt=\"\">' : '')\n    + '<div style=\"padding:10px 12px 12px\"><div style=\"font-weight:700;line-height:1.3;margin-bottom:4px\">' + esc(l.title || '未命名房源') + '</div>'\n    + '<div style=\"color:#64748b;font-size:12px;margin-bottom:8px\">' + esc(statsLine(l)) + (n ? ' · ♥ ' + n + ' 票' : '') + '</div>'\n    + '<button onclick=\"focusCard(\\'' + l.id + '\\')\" style=\"width:100%;background:#4f46e5;color:#fff;font-weight:700;border-radius:10px;padding:6px 0\">看这间 ↓</button></div>';\n}\nfunction renderMap(list){\n  mapList = list;\n  $('#mapBox').hidden = !showMap;\n  $('#mapToggle').textContent = showMap ? '🗺️ 隐藏地图' : '🗺️ 显示地图';\n  if (!mapVisible() || !ensureMap()) return;\n  mapLayer.clearLayers();\n  Object.keys(pinById).forEach(k => delete pinById[k]);\n  const pts = [];\n  list.forEach(l => {\n    if (l.lat == null || l.lng == null) return;\n    const m = L.marker([l.lat, l.lng], { icon: L.divIcon({ className: 'pin-wrap', html: pinHtml(l), iconSize: [0, 0] }), riseOnHover: true })\n      .bindPopup(popupHtml(l), { maxWidth: 240, minWidth: 230, closeButton: true, autoPanPadding: [20, 20] })\n      .addTo(mapLayer);\n    pinById[l.id] = m;\n    pts.push([l.lat, l.lng]);\n  });\n  const missing = list.length - pts.length;\n  $('#mapNote').hidden = !missing;\n  $('#mapNote').textContent = missing + ' 间还在获取位置…';\n  // 只有房源集合变了（换行程/筛选/新加房源）才重新取景，投票重排不动地图\n  const key = trip + '|' + filter + '|' + list.map(l => l.id + (l.lat != null ? '@' : '')).sort().join(',');\n  if (key !== mapKey) {\n    mapKey = key;\n    map.invalidateSize();\n    // 不做动画：坐标是一间间陆续到的，连续的缩放动画会互相打断，停在半路\n    if (pts.length === 1) map.setView(pts[0], 12, { animate: false });\n    else if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 13, animate: false });\n  }\n}\nfunction setHot(id, on){\n  const m = pinById[id];\n  const el = m && m.getElement() && m.getElement().querySelector('.pin');\n  if (!el) return;\n  el.classList.toggle('hot', on);\n  m.setZIndexOffset(on ? 1000 : 0);\n}\nfunction focusCard(id){\n  const el = $('#grid').querySelector('article[data-id=\"' + CSS.escape(id) + '\"]');\n  if (!el) return;\n  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });\n  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');\n}\nfunction toggleMap(){\n  showMap = !showMap;\n  try { localStorage.setItem('showMap', showMap ? '1' : '0'); } catch(e){}\n  mapKey = '';\n  renderMap(mapList);\n}\n\n// Re-render the grid. Cards that change position glide to their new spot (FLIP).\n// If anchorId is given, the page scrolls so that card stays where it was on screen.\nfunction render(anchorId){\n  if (reorderTimer) { clearTimeout(reorderTimer); reorderTimer = null; }\n  const grid = $('#grid');\n  const before = {};\n  grid.querySelectorAll('article[data-id]').forEach(el => { before[el.dataset.id] = el.getBoundingClientRect(); });\n  let list = STATE.listings.slice();\n  if (filter !== 'all') list = list.filter(l => l.area === filter);\n  if (sortBy === 'votes') list.sort((a,b) => (b.votes||[]).length - (a.votes||[]).length || (a.priceUSD||1e9) - (b.priceUSD||1e9));\n  else if (sortBy === 'added') list.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)); // 最新添加的在前；没有 createdAt 的老房源排最后\n  else list.sort((a,b) => (a.priceUSD||1e9) - (b.priceUSD||1e9));\n  grid.innerHTML = list.length ? list.map(card).join('') : '<p class=\"text-slate-400 col-span-full text-center py-10\">' + (filter === 'all' ? '还没有候选' : '这个区域还没有候选') + '，贴个 Airbnb 链接进来吧 👆</p>';\n  $('#countLbl').textContent = '共 ' + STATE.listings.length + ' 间候选';\n  restoreSlides(grid);\n  renderMap(list);\n\n  const anchorEl = anchorId && grid.querySelector('article[data-id=\"' + CSS.escape(anchorId) + '\"]');\n  if (anchorEl && before[anchorId]) window.scrollBy(0, anchorEl.getBoundingClientRect().top - before[anchorId].top);\n  if (reduceMotion) return;\n  grid.querySelectorAll('article[data-id]').forEach(el => {\n    const a = before[el.dataset.id];\n    if (!a) return;\n    const b = el.getBoundingClientRect();\n    const dx = a.left - b.left, dy = a.top - b.top;\n    if (!dx && !dy) return;\n    el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],\n      { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });\n  });\n}\n\n// After a vote: update just that card in place first, then reorder a moment later\n// so the user sees their vote land before the list shuffles.\nfunction afterVote(id, votes){\n  const i = STATE.listings.findIndex(x => x.id === id);\n  if (i < 0) return;\n  STATE.listings[i].votes = votes;\n  const old = $('#grid').querySelector('article[data-id=\"' + CSS.escape(id) + '\"]');\n  if (!old || sortBy !== 'votes') { render(id); return; }\n  old.outerHTML = card(STATE.listings[i]);\n  restoreSlides($('#grid'));\n  if (reorderTimer) clearTimeout(reorderTimer);\n  reorderTimer = setTimeout(() => {\n    render(id);\n    const el = $('#grid').querySelector('article[data-id=\"' + CSS.escape(id) + '\"]');\n    if (el) { el.classList.add('just-voted'); setTimeout(() => el.classList.remove('just-voted'), 1200); }\n  }, 700);\n}\n\n// 投票成功的庆祝，像收到 offer 一样：投票按钮炸开彩带和爱心 + 两侧礼炮 + 顶部横幅\nconst CONFETTI_COLORS = ['#e11d48', '#fb7185', '#4f46e5', '#a855f7', '#ec4899', '#facc15'];\nlet toastTimer = null, heartShape = null;\nfunction celebrate(id){\n  const l = STATE.listings.find(x => x.id === id);\n  if (!l) return; // 等待期间切了标签页\n  const toast = $('#toast');\n  toast.textContent = '🎉 投票成功！给「' + (l.title || '未命名房源') + '」+1';\n  toast.classList.add('show');\n  if (toastTimer) clearTimeout(toastTimer);\n  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);\n\n  if (reduceMotion || !window.confetti) return;\n  const btn = $('#grid').querySelector('article[data-id=\"' + CSS.escape(id) + '\"] .vote-btn');\n  if (btn) btn.classList.add('vote-pop');\n  const r = btn && btn.getBoundingClientRect();\n  const origin = r ? { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight } : { x: .5, y: .6 };\n  heartShape = heartShape || confetti.shapeFromText({ text: '❤️', scalar: 2 });\n  confetti({ particleCount: 90, spread: 75, startVelocity: 40, origin, colors: CONFETTI_COLORS });\n  confetti({ particleCount: 12, spread: 60, startVelocity: 32, origin, shapes: [heartShape], scalar: 2 });\n  const end = Date.now() + 800;\n  (function cannons(){\n    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: .75 }, colors: CONFETTI_COLORS });\n    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: .75 }, colors: CONFETTI_COLORS });\n    if (Date.now() < end) requestAnimationFrame(cannons);\n  })();\n}\n\n// 切换行程时重画标题、标签页、区域筛选和手动表单\nfunction renderTrip(){\n  // 分账是全员一本账，不分行程：不显示行程标签页和日期人数\n  const forTrip = view !== 'split';\n  $('#tripSub').textContent = (forTrip ? T.date + ' · ' + T.people + '人 · 住' + T.nights + '晚 · ' : '') + VIEWS[view].sub;\n  $('#tabs').classList.toggle('hidden', !forTrip); // 用 class：hidden 属性会被 .flex 盖掉\n  $('#tabs').innerHTML = Object.keys(TRIPS).map(k => {\n    const t = TRIPS[k];\n    return '<button data-trip=\"' + k + '\" class=\"trip-tab rounded-full px-5 py-2 font-bold' + (k === trip ? ' active' : '') + '\">'\n      + t.date + ' <span class=\"font-normal text-sm opacity-80\">· ' + t.people + '人 · ' + t.nights + '晚</span></button>';\n  }).join('');\n  $('#filters').innerHTML = ['all'].concat(T.areas).map(a =>\n    '<button data-f=\"' + esc(a) + '\" class=\"filter-chip border rounded-full px-4 py-1.5 text-sm bg-white' + (a === filter ? ' active' : '') + '\">' + (a === 'all' ? '全部' : esc(a)) + '</button>'\n  ).join('');\n  $('#mArea').innerHTML = '<option value=\"\">区域（可选）</option>' + T.areas.concat('其他').map(a => '<option>' + esc(a) + '</option>').join('');\n  $('#mPrice').placeholder = T.nights + '晚总价 USD（可选）';\n}\n\nfunction renderNav(){\n  document.querySelectorAll('[data-view]').forEach(b => {\n    const on = b.dataset.view === view;\n    b.classList.toggle('active', on);\n    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');\n  });\n  $('#viewTitle').textContent = VIEWS[view].title;\n  Object.keys(VIEWS).forEach(v => { $('#view-' + v).hidden = v !== view; });\n}\nfunction switchView(v){\n  if (v === view || !VIEWS[v]) return;\n  view = v;\n  syncHash();\n  renderNav();\n  renderTrip();\n  if (v === 'split') loadSplit(); // 拿最新的账，别人可能刚记了\n  const el = $('#view-' + v);\n  el.classList.remove('view-enter'); void el.offsetWidth; el.classList.add('view-enter');\n  window.scrollTo({ top: 0 });\n  if (v === 'hunt') { mapKey = ''; renderMap(mapList); } // 地图藏着的时候量不到尺寸，回来重新取景\n}\n\nfunction switchTrip(k){\n  if (k === trip) return;\n  trip = k; T = TRIPS[k]; filter = 'all';\n  if (reorderTimer) { clearTimeout(reorderTimer); reorderTimer = null; } // 别让上一页投票后的重排画到新标签页\n  syncHash();\n  STATE = { ...STATE, listings: [] }; // 账本是全员共用的，切行程不用清\n  $('#grid').innerHTML = ''; $('#countLbl').textContent = ''; $('#addMsg').textContent = '';\n  renderTrip();\n  refresh();\n}\n\nasync function refresh(){\n  const t = trip;\n  const s = await api('/api/state?trip=' + t);\n  if (t !== trip) return; // 等待期间切了标签页，丢掉旧结果\n  STATE = s; render(); renderSplit(); enrichMissing();\n}\n\nasync function enrichMissing(){\n  const t = trip;\n  for (const l of STATE.listings) {\n    if (t !== trip) return;\n    if (!l.image || l.rating == null || !l.images || l.images.length < 2 || !('lat' in l)) {\n      try { const r = await api('/api/enrich', 'POST', { trip: t, id: l.id }); if (t === trip && r.ok && r.listing) { const i = STATE.listings.findIndex(x => x.id === l.id); if (i >= 0) STATE.listings[i] = r.listing; render(); } } catch(e){}\n    }\n  }\n}\n\n// ---------- 登录：从后端的用户列表里选名字 ----------\nlet USERS = [];\nlet pendingFn = null;\nasync function loadUsers(){\n  try { const r = await api('/api/users'); if (r.ok) USERS = r.users; } catch(e){}\n  renderUserSel(); renderSplit();\n}\nfunction renderUserSel(){\n  $('#pickBox').hidden = !USERS.length;\n  $('#userSel').innerHTML = '<option value=\"\">选择你的名字…</option>'\n    + USERS.map(u => '<option' + (u.name === myName ? ' selected' : '') + '>' + esc(u.name) + '</option>').join('');\n}\nfunction renderAccount(){\n  const ini = myName ? esc(Array.from(myName)[0].toUpperCase()) : '?';\n  $('#accountBtn').innerHTML = '<span class=\"avatar w-7 h-7 text-xs\">' + ini + '</span>'\n    + '<span class=\"max-w-[8rem] truncate\">' + (myName ? esc(myName) : '登录') + '</span>';\n  $('#accountBtn').title = myName ? '切换用户' : '登录';\n}\nfunction openLogin(fn){\n  pendingFn = fn || null;\n  $('#loginMsg').textContent = ''; $('#nameInput').value = '';\n  renderUserSel();\n  $('#nameModal').classList.add('open');\n  (USERS.length ? $('#userSel') : $('#nameInput')).focus();\n  loadUsers(); // 别人可能刚注册，顺手刷新一下列表\n}\nfunction ensureNameThen(fn){ if (myName) fn(); else openLogin(fn); }\nasync function login(name){\n  name = name.trim();\n  if (!name) return;\n  $('#loginMsg').textContent = '';\n  let r;\n  try { r = await api('/api/login', 'POST', { name, token: myToken }); } catch(e) { r = { ok: false, error: '网络有点问题，稍后再试' }; }\n  if (!r.ok) { $('#loginMsg').textContent = r.error || '登录失败'; return; }\n  myName = r.user.name; myToken = r.user.token; USERS = r.users;\n  localStorage.setItem('vn', myName); localStorage.setItem('vt', myToken);\n  $('#nameModal').classList.remove('open');\n  renderAccount(); render(); renderSplit(); refresh();\n  if (pendingFn) { const f = pendingFn; pendingFn = null; f(); }\n}\n$('#pickOk').onclick = () => login($('#userSel').value);\n$('#userSel').onchange = e => { if (e.target.value) login(e.target.value); };\n$('#nameOk').onclick = () => login($('#nameInput').value);\n$('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') login(e.target.value); });\n$('#loginSkip').onclick = () => { pendingFn = null; $('#nameModal').classList.remove('open'); };\n$('#accountBtn').onclick = () => openLogin();\nrenderAccount();\nPromise.all([loadUsers(), splashDone]).then(() => { if (!myName) openLogin(); });\n\nasync function doVote(id){\n  const l = STATE.listings.find(x => x.id === id);\n  const voted = (l.votes || []).some(v => v.token === myToken);\n  if (voted) {\n    const r = await api('/api/vote', 'POST', { trip, id, token: myToken, name: null });\n    if (r.ok) afterVote(id, r.votes); // 切了标签页就找不到这间，afterVote 会忽略\n  } else {\n    const t = trip;\n    ensureNameThen(async () => {\n      const r = await api('/api/vote', 'POST', { trip: t, id, token: myToken, name: myName });\n      if (r.ok) { afterVote(id, r.votes); celebrate(id); }\n    });\n  }\n}\n\nasync function removeListing(id){\n  const l = STATE.listings.find(x => x.id === id);\n  if (!l) return;\n  if (!confirm('确定要删除「' + (l.title || '未命名房源') + '」吗？删掉后大家就看不到了。')) return;\n  const r = await api('/api/remove', 'POST', { trip, id });\n  if (r.ok) await refresh(); else alert('删除失败，稍后再试');\n}\n\nasync function addListing(){\n  const url = $('#urlInput').value.trim();\n  if (!url) return;\n  const btn = $('#addBtn'); btn.disabled = true; btn.textContent = '抓取中…';\n  $('#addMsg').textContent = '正在读取 Airbnb 房源信息…';\n  try {\n    const r = await api('/api/add', 'POST', { trip, url });\n    if (r.ok) {\n      $('#urlInput').value = '';\n      $('#addMsg').textContent = r.deduped ? '这间已经在清单里了' : '已加入清单 🎉';\n      $('#addMsg').className = 'text-sm mt-2 text-green-600';\n      await refresh();\n      window.scrollTo({ top: 0, behavior: 'smooth' });\n    } else {\n      $('#addMsg').textContent = '自动抓取失败：' + (r.error || '未知错误') + '，可以用下面的手动添加';\n      $('#addMsg').className = 'text-sm mt-2 text-amber-600';\n      $('#mUrl').value = url;\n      $('#manualBox').open = true;\n    }\n  } catch(e) {\n    $('#addMsg').textContent = '网络有点问题，稍后再试';\n    $('#addMsg').className = 'text-sm mt-2 text-red-500';\n  }\n  btn.disabled = false; btn.textContent = '加入清单';\n}\n$('#addBtn').onclick = addListing;\n$('#urlInput').addEventListener('keydown', e => { if (e.key === 'Enter') addListing(); });\n\n$('#manualBtn').onclick = async () => {\n  const body = { trip, url: $('#mUrl').value.trim(), title: $('#mTitle').value.trim(), image: $('#mImage').value.trim(),\n    priceUSD: $('#mPrice').value ? Number($('#mPrice').value) : null, priceNights: T.nights,\n    bedrooms: $('#mBedrooms').value ? Number($('#mBedrooms').value) : null,\n    beds: $('#mBeds').value ? Number($('#mBeds').value) : null,\n    bathrooms: $('#mBaths').value ? Number($('#mBaths').value) : null,\n    sleeps: $('#mSleeps').value ? Number($('#mSleeps').value) : null,\n    area: $('#mArea').value, note: $('#mNote').value.trim() };\n  if (!body.url || !body.title) { alert('链接和标题是必填的'); return; }\n  const r = await api('/api/add-manual', 'POST', body);\n  if (r.ok) { ['mUrl','mTitle','mImage','mPrice','mBedrooms','mBeds','mBaths','mSleeps','mNote'].forEach(id => $('#'+id).value=''); $('#manualBox').open = false; await refresh(); }\n  else alert('添加失败：' + (r.error || ''));\n};\n\n// ---------- 分账 Splitwise ----------\nfunction fmtMoney(cents){\n  return '$' + (Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });\n}\n// 成员名单：全员共用的用户列表（登录、投票、分账都是这一份）+ 账里出现过的名字\nfunction knownNames(){\n  const out = [];\n  const push = n => { n = String(n || '').trim(); if (n && !out.some(x => x.toLowerCase() === n.toLowerCase())) out.push(n); };\n  USERS.forEach(u => push(u.name));\n  push(myName);\n  (STATE.expenses || []).forEach(e => { push(e.paidBy); (e.splitAmong || []).forEach(push); });\n  return out;\n}\nfunction renderSplit(){\n  const names = knownNames();\n  $('#memberChips').innerHTML = names.length\n    ? names.map(n => '<span class=\"chip\">' + esc(n) + '</span>').join('')\n    : '<span class=\"text-sm text-slate-400\">还没有成员，先加上大家的名字（投过票的人会自动出现）</span>';\n  const sel = $('#ePaidBy'); const prev = sel.value;\n  sel.innerHTML = names.map(n => '<option' + ((prev ? n === prev : n === myName) ? ' selected' : '') + '>' + esc(n) + '</option>').join('');\n  const prevChecked = {};\n  document.querySelectorAll('#eSplit input[type=checkbox]').forEach(c => { prevChecked[c.value] = c.checked; });\n  $('#eSplit').innerHTML = names.length\n    ? names.map(n => '<label class=\"inline-flex items-center gap-1 mr-3 mb-1 text-sm\"><input type=\"checkbox\" value=\"' + esc(n) + '\"' + ((n in prevChecked) ? (prevChecked[n] ? ' checked' : '') : ' checked') + '> ' + esc(n) + '</label>').join('')\n    : '<span class=\"text-sm text-slate-400\">先加成员</span>';\n  const bal = STATE.balances || {};\n  const entries = Object.entries(bal).sort((a, b) => b[1] - a[1]);\n  $('#balances').innerHTML = entries.length\n    ? '<h3 class=\"font-bold mb-2\">余额（+ 应收回 · − 应付出）</h3>' + entries.map(([n, c]) =>\n        '<div class=\"flex justify-between border-b py-1.5 text-sm\"><span>' + esc(n) + '</span><span class=\"font-medium '\n        + (c > 0 ? 'text-emerald-600' : c < 0 ? 'text-rose-600' : 'text-slate-400') + '\">'\n        + (c === 0 ? '已结清' : (c > 0 ? '+' : '−') + fmtMoney(c)) + '</span></div>').join('')\n    : '';\n  const st = STATE.settlements || [];\n  $('#settlements').innerHTML = st.length\n    ? '<h3 class=\"font-bold mb-2\">💸 这样结清最省事</h3>' + st.map(s => '<div class=\"text-sm py-1\">' + esc(s.from) + ' 付给 ' + esc(s.to) + ' <b>' + fmtMoney(s.amountCents) + '</b></div>').join('')\n    : (entries.length ? '<p class=\"text-sm text-emerald-600\">大家已经结清了 🎉</p>' : '');\n  const exps = STATE.expenses || [];\n  readEditor(); // 重画前先把编辑框里没保存的内容存下来\n  if (editingId && !exps.some(e => e.id === editingId)) { editingId = null; editDraft = null; } // 这笔被别人删了\n  $('#expenses').innerHTML = exps.length\n    ? '<h3 class=\"font-bold mb-2\">支出记录</h3>' + exps.map(e =>\n        '<div class=\"flex items-center gap-2 border-b py-2 text-sm' + (e.id === editingId ? ' bg-amber-50 -mx-2 px-2 rounded-t-lg' : '') + '\"><div class=\"flex-1\"><div>' + esc(e.description)\n        + '</div><div class=\"text-slate-500 text-xs\">' + esc(e.paidBy) + ' 付的 · 分摊给 ' + (e.splitAmong || []).map(esc).join('、')\n        + '</div></div><div class=\"font-medium\">' + fmtMoney(e.amountCents)\n        + '</div><button onclick=\"editExpense(\\'' + e.id + '\\')\" class=\"text-slate-400 hover:text-indigo-600 px-1\" title=\"修改这笔\">✎</button>'\n        + '<button onclick=\"removeExpense(\\'' + e.id + '\\')\" class=\"text-slate-400 hover:text-red-600 px-1\" title=\"删除这笔\">✕</button></div>'\n        + (e.id === editingId ? editorHtml(names) : '')).join('')\n    : '<p class=\"text-sm text-slate-400\">还没有支出记录</p>';\n}\nfunction applySplitView(r){\n  if (r.expenses) STATE.expenses = r.expenses;\n  if (r.balances) STATE.balances = r.balances;\n  if (r.settlements) STATE.settlements = r.settlements;\n  if (r.users) { USERS = r.users; renderUserSel(); }\n}\nasync function loadSplit(){\n  try { const r = await api('/api/split'); if (r.ok) { applySplitView(r); renderSplit(); } } catch(e){}\n}\n// 加成员 = 加进全员共用的用户列表，之后登录时直接选名字\nasync function addMember(){\n  const v = $('#memberInput').value.trim();\n  if (!v) return;\n  const r = await api('/api/member', 'POST', { name: v });\n  if (r.ok) { $('#memberInput').value = ''; applySplitView(r); renderSplit(); }\n  else alert('添加失败：' + (r.error || ''));\n}\nasync function addExpense(){\n  const splitAmong = [...document.querySelectorAll('#eSplit input[type=checkbox]:checked')].map(c => c.value);\n  const amountUSD = $('#eAmount').value ? Number($('#eAmount').value) : null;\n  if (!amountUSD) { $('#eMsg').textContent = '先填金额'; return; }\n  if (!$('#ePaidBy').value) { $('#eMsg').textContent = '先加成员并选择付款人'; return; }\n  const r = await api('/api/expense', 'POST', { description: $('#eDesc').value.trim(), amountUSD, paidBy: $('#ePaidBy').value, splitAmong });\n  if (r.ok) { $('#eDesc').value = ''; $('#eAmount').value = ''; $('#eMsg').textContent = '记上了 ✅'; applySplitView(r); renderSplit(); }\n  else $('#eMsg').textContent = r.error || '记账失败';\n}\n// ---- 修改一笔：编辑框直接展开在这一行下面 ----\nfunction editorHtml(names){\n  const d = editDraft, on = d.checked.map(n => n.toLowerCase());\n  return '<div id=\"editBox\" class=\"bg-amber-50 -mx-2 px-2 pb-3 pt-1 mb-1 rounded-b-lg text-sm\"'\n    + ' onkeydown=\"if (event.key === \\'Enter\\') saveEdit(); else if (event.key === \\'Escape\\') cancelEdit();\">'\n    + '<div class=\"grid md:grid-cols-3 gap-2 mb-2\">'\n    + '<input id=\"editDesc\" class=\"border rounded-lg px-3 py-2 bg-white\" placeholder=\"支出说明\" value=\"' + esc(d.desc) + '\">'\n    + '<input id=\"editAmount\" type=\"number\" step=\"0.01\" min=\"0\" class=\"border rounded-lg px-3 py-2 bg-white\" placeholder=\"金额 USD\" value=\"' + esc(d.amount) + '\">'\n    + '<select id=\"editPaidBy\" class=\"border rounded-lg px-3 py-2 bg-white\">'\n    + names.map(n => '<option' + (n.toLowerCase() === d.paidBy.toLowerCase() ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>'\n    + '</div><div class=\"mb-2\"><span class=\"font-medium mr-2\">分摊给</span>'\n    + names.map(n => '<label class=\"inline-flex items-center gap-1 mr-3 mb-1\"><input type=\"checkbox\" value=\"' + esc(n) + '\"' + (on.includes(n.toLowerCase()) ? ' checked' : '') + '> ' + esc(n) + '</label>').join('')\n    + '</div><button onclick=\"saveEdit()\" class=\"bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4 py-1.5\">保存修改</button>'\n    + '<button onclick=\"cancelEdit()\" class=\"border-2 border-slate-200 hover:border-slate-400 bg-white text-slate-600 rounded-xl px-4 py-1 ml-2\">取消</button>'\n    + '<span id=\"editMsg\" class=\"ml-3 text-rose-600\"></span></div>';\n}\nfunction readEditor(){\n  if (!editingId || !$('#editBox')) return;\n  editDraft = { desc: $('#editDesc').value, amount: $('#editAmount').value, paidBy: $('#editPaidBy').value,\n    checked: [...document.querySelectorAll('#editBox input[type=checkbox]:checked')].map(c => c.value) };\n}\nfunction editExpense(id){\n  const e = (STATE.expenses || []).find(x => x.id === id);\n  if (!e) return;\n  editingId = id;\n  editDraft = { desc: e.description, amount: String(e.amountCents / 100), paidBy: e.paidBy, checked: e.splitAmong || [] };\n  $('#editBox')?.remove(); // 换一笔改：上一笔没保存的不要了\n  renderSplit();\n  $('#editBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });\n  $('#editAmount').focus({ preventScroll: true });\n}\nfunction cancelEdit(){ editingId = null; editDraft = null; renderSplit(); }\nasync function saveEdit(){\n  readEditor();\n  const d = editDraft;\n  const amountUSD = d.amount ? Number(d.amount) : null;\n  if (!amountUSD) { $('#editMsg').textContent = '先填金额'; return; }\n  const r = await api('/api/expense-update', 'POST', { id: editingId, description: d.desc.trim(), amountUSD, paidBy: d.paidBy, splitAmong: d.checked });\n  if (r.ok) { editingId = null; editDraft = null; applySplitView(r); renderSplit(); }\n  else if (r.error === '支出不存在') { editingId = null; editDraft = null; loadSplit(); alert('这笔已经被别人删掉了'); }\n  else $('#editMsg').textContent = r.error || '修改失败';\n}\nasync function removeExpense(id){\n  if (!confirm('删除这笔支出？')) return;\n  const r = await api('/api/expense-remove', 'POST', { id });\n  if (r.ok) { applySplitView(r); renderSplit(); } else alert('删除失败，稍后再试');\n}\n// 卡片上的「用这间分账」：把房源标题和总价预填进分账表单\nfunction splitListing(id){\n  const l = STATE.listings.find(x => x.id === id);\n  if (!l) return;\n  $('#eDesc').value = l.title || '房费';\n  if (l.priceUSD) $('#eAmount').value = l.priceUSD;\n  switchView('split');\n  $('#eAmount').focus({ preventScroll: true });\n}\n$('#memberBtn').onclick = addMember;\n$('#memberInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMember(); });\n$('#eAddBtn').onclick = addExpense;\n\n// 筛选按钮和标签页都是动态生成的，用事件委托\n$('#filters').onclick = e => {\n  const b = e.target.closest('.filter-chip');\n  if (!b) return;\n  document.querySelectorAll('.filter-chip').forEach(x => x.classList.remove('active'));\n  b.classList.add('active'); filter = b.dataset.f; render();\n};\n$('#tabs').onclick = e => { const b = e.target.closest('.trip-tab'); if (b) switchTrip(b.dataset.trip); };\n$('#mapToggle').onclick = toggleMap;\n// 鼠标停在卡片上时，地图上对应的钉子跟着高亮\nlet hotId = null;\n$('#grid').addEventListener('mouseover', e => {\n  const a = e.target.closest('article[data-id]'); const id = a ? a.dataset.id : null;\n  if (id === hotId) return;\n  if (hotId) setHot(hotId, false);\n  hotId = id; if (id) setHot(id, true);\n});\n$('#grid').addEventListener('mouseleave', () => { if (hotId) setHot(hotId, false); hotId = null; });\n$('#sortSel').onchange = e => { sortBy = e.target.value; render(); };\n\ndocument.querySelectorAll('[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));\n\nrenderNav();\nrenderTrip();\nrefresh();\n</script>\n</body>\n</html>\n";
// Cloudflare Worker: Thanksgiving Denver trip — shared Airbnb shortlist + voting
// Static frontend is served from ./public via [assets]; API routes handled here.
// KV binding: VOTES_KV

// ---- Seed listings (verified 2026-09-30, 10 adults, Nov 25–29, totals incl. fees) ----
// priceUSD here is a 4-night total; the frontend labels listings without
// priceNights as 4 nights for that reason.
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

// ---- Trips: each leg has its own shortlist under its own KV key ----
// nov26 keeps the original 'state:v1' key so the existing list carries over.
const TRIPS = {
  nov25: { kvKey: 'state:nov25:v1', seed: [] },      // Nov 25–26, 9 people
  nov26: { kvKey: 'state:v1', seed: SEED },          // Nov 26–29, 14 people
};
const DEFAULT_TRIP = 'nov26'; // requests without a trip (old cached pages) hit the original list
const tripOf = t => TRIPS[t] || TRIPS[DEFAULT_TRIP];

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
  // Airbnb's (slightly fuzzed) listing location. lat stays null when the page
  // has none, so callers can tell "looked, not found" from "never looked".
  const la = numRe(html, /"latitude":(-?\d+\.\d+)/), lo = numRe(html, /"longitude":(-?\d+\.\d+)/);
  const geo = la != null && lo != null && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  return { ok: true, title, image, images, bedrooms, bathrooms, beds, guests, rating, reviews: ld.reviews,
    lat: geo ? la : null, lng: geo ? lo : null };
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

async function getState(env, trip) {
  const raw = await env.VOTES_KV.get(trip.kvKey);
  if (raw) {
    const state = JSON.parse(raw);
    // Migrate states saved before splitwise existed.
    if (!Array.isArray(state.listings)) state.listings = [];
    if (!Array.isArray(state.members)) state.members = [];
    if (!Array.isArray(state.expenses)) state.expenses = [];
    return state;
  }
  const state = { listings: trip.seed.map(s => ({ id: uid(), ...s, addedBy: 'Ken', createdAt: Date.now(), votes: [] })), members: [], expenses: [], updatedAt: Date.now() };
  await env.VOTES_KV.put(trip.kvKey, JSON.stringify(state));
  return state;
}
async function saveState(env, trip, state) {
  state.updatedAt = Date.now();
  await env.VOTES_KV.put(trip.kvKey, JSON.stringify(state));
}

// ---------- route handlers ----------
async function handleAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const url = String(body.url || '').trim();
  const roomId = roomIdFrom(url);
  if (!roomId) return j({ ok: false, error: '看起来不是 Airbnb 房源链接（需要形如 airbnb.com/rooms/123… 的链接）' });
  const trip = tripOf(body.trip);
  // Fast-path dedupe check only — do NOT hold this snapshot across the scrape.
  const preState = await getState(env, trip);
  const preExisting = preState.listings.find(l => l.roomId === roomId);
  if (preExisting) return j({ ok: true, listing: preExisting, deduped: true });
  // Scrape first, read state after. Scraping can take up to ~35s
  // (10s direct + 10s .co.uk + 15s reader); holding a pre-scrape snapshot
  // and saving it afterwards would clobber any votes / adds / removes
  // that happened in that window (lost-update bug).
  const info = await fetchListingInfo(url);
  // Re-read fresh state now that the slow work is done, and re-check
  // dedupe: another request may have added this same room meanwhile.
  const state = await getState(env, trip);
  const existing = state.listings.find(l => l.roomId === roomId);
  if (existing) return j({ ok: true, listing: existing, deduped: true });
  const listing = {
    id: uid(), roomId, url,
    title: (info.title || '').slice(0, 120) || '未命名房源',
    image: info.image || '', images: info.images || [], area: '', priceUSD: null,
    ...('lat' in info ? { lat: info.lat, lng: info.lng } : {}),
    sleeps: info.guests || null, bedrooms: info.bedrooms, beds: info.beds, bathrooms: info.bathrooms,
    rating: info.rating || null, reviews: info.reviews || null, note: '', addedBy: '', createdAt: Date.now(), votes: []
  };
  state.listings.unshift(listing);
  await saveState(env, trip, state);
  return j({ ok: true, listing, fetched: info.ok });
}

async function handleAddManual(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const url = String(body.url || '').trim();
  const title = String(body.title || '').trim().slice(0, 120);
  const roomId = roomIdFrom(url);
  if (!roomId || !title) return j({ ok: false, error: '链接和标题是必填的' });
  const trip = tripOf(body.trip);
  const state = await getState(env, trip);
  if (state.listings.find(l => l.roomId === roomId)) return j({ ok: false, error: '这间已经在清单里了' });
  const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v);
  const listing = { id: uid(), roomId, url, title,
    image: String(body.image || '').trim().slice(0, 500), area: String(body.area || '').slice(0, 40),
    priceUSD: num(body.priceUSD), priceNights: num(body.priceNights), sleeps: num(body.sleeps), bedrooms: num(body.bedrooms),
    beds: num(body.beds), bathrooms: num(body.bathrooms),
    rating: null, reviews: null, note: String(body.note || '').slice(0, 200),
    addedBy: '', createdAt: Date.now(), votes: [] };
  state.listings.unshift(listing);
  await saveState(env, trip, state);
  return j({ ok: true, listing });
}

async function handleVote(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { id, token, name } = body;
  if (!id || !token) return j({ ok: false, error: '缺少参数' });
  const trip = tripOf(body.trip);
  const state = await getState(env, trip);
  const listing = state.listings.find(l => l.id === id);
  if (!listing) return j({ ok: false, error: '房源不存在' });
  listing.votes = (listing.votes || []).filter(v => v.token !== token);
  let voted = false;
  if (name) {
    listing.votes.push({ token: String(token).slice(0, 80), name: String(name).slice(0, 20), at: Date.now() });
    voted = true;
  }
  await saveState(env, trip, state);
  return j({ ok: true, votes: listing.votes, voted });
}

async function handleRemove(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const trip = tripOf(body.trip);
  const state = await getState(env, trip);
  const i = state.listings.findIndex(l => l.id === body.id);
  if (i < 0) return j({ ok: false, error: '房源不存在' });
  state.listings.splice(i, 1);
  await saveState(env, trip, state);
  return j({ ok: true });
}

async function handleEnrich(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const trip = tripOf(body.trip);
  // Peek only to get the URL to scrape — do NOT hold this snapshot
  // across the scrape (see handleAdd: it can take up to ~35s, and
  // saving a stale snapshot would clobber concurrent changes).
  const peekState = await getState(env, trip);
  const peek = peekState.listings.find(l => l.id === body.id);
  if (!peek) return j({ ok: false });
  const info = await fetchListingInfo(peek.url);
  if (!info.ok) return j({ ok: false });
  // Re-read fresh state after scraping and merge onto the live listing.
  // If it was removed while we were scraping, don't resurrect it.
  const state = await getState(env, trip);
  const listing = state.listings.find(l => l.id === body.id);
  if (!listing) return j({ ok: false });
  if ((!listing.title || listing.title === '未命名房源') && info.title) listing.title = info.title.slice(0, 120);
  if (!listing.image && info.image) listing.image = info.image;
  if ((info.images || []).length > (listing.images || []).length) listing.images = info.images;
  if ('lat' in info && listing.lat == null) { listing.lat = info.lat; listing.lng = info.lng; }
  if (listing.bedrooms == null && info.bedrooms != null) listing.bedrooms = info.bedrooms;
  if (listing.bathrooms == null && info.bathrooms != null) listing.bathrooms = info.bathrooms;
  if (listing.beds == null && info.beds != null) listing.beds = info.beds;
  if (listing.sleeps == null && info.guests != null) listing.sleeps = info.guests;
  if (listing.rating == null && info.rating != null) listing.rating = info.rating;
  if (listing.reviews == null && info.reviews != null) listing.reviews = info.reviews;
  await saveState(env, trip, state);
  return j({ ok: true, listing });
}

// ---------- Splitwise: one expense ledger for the whole group ----------
// Money is handled in integer cents to avoid float drift. Each expense is
// split equally among splitAmong; leftover cents go one each to the first
// participants (in listed order) so shares always sum to the exact total.
function computeBalances(expenses) {
  const bal = {};
  for (const e of expenses || []) {
    const cents = Math.round(Number(e.amountCents) || 0);
    const among = (e.splitAmong || []).filter(Boolean);
    if (!cents || !among.length || !e.paidBy) continue;
    bal[e.paidBy] = (bal[e.paidBy] || 0) + cents;
    const base = Math.floor(cents / among.length);
    let rem = cents - base * among.length;
    for (const name of among) {
      const share = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
      bal[name] = (bal[name] || 0) - share;
    }
  }
  return bal;
}

// Greedy settle-up: biggest debtor pays biggest creditor first, which
// keeps the number of transfers at or below (people - 1).
function computeSettlements(balances) {
  const debtors = Object.entries(balances || {}).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const creditors = Object.entries(balances || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const out = [];
  let di = 0, ci = 0;
  let dLeft = debtors.length ? -debtors[0][1] : 0;
  let cLeft = creditors.length ? creditors[0][1] : 0;
  while (di < debtors.length && ci < creditors.length) {
    const amt = Math.min(dLeft, cLeft);
    if (amt > 0) out.push({ from: debtors[di][0], to: creditors[ci][0], amountCents: amt });
    dLeft -= amt; cLeft -= amt;
    if (dLeft === 0) { di++; if (di < debtors.length) dLeft = -debtors[di][1]; }
    if (cLeft === 0) { ci++; if (ci < creditors.length) cLeft = creditors[ci][1]; }
  }
  return out;
}

function splitView(split) {
  const balances = computeBalances(split.expenses);
  return { expenses: split.expenses, balances, settlements: computeSettlements(balances) };
}
const cleanName = v => String(v || '').trim().slice(0, 20);

// One ledger for the whole group (not per trip); members are the global user list.
const SPLIT_KEY = 'split:v1';
async function getSplit(env) {
  const raw = await env.VOTES_KV.get(SPLIT_KEY);
  if (raw) return JSON.parse(raw);
  // First run: expenses and members used to be kept per trip. Merge the
  // expenses into one ledger and the member names into the user list.
  const expenses = [], names = [];
  for (const key of Object.keys(TRIPS)) {
    const state = await getState(env, TRIPS[key]);
    expenses.push(...state.expenses);
    names.push(...state.members);
  }
  expenses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const users = await addUsers(env, names.concat(...expenses.map(e => [e.paidBy, ...e.splitAmong])));
  for (const e of expenses) {
    e.paidBy = canonName(users, e.paidBy);
    e.splitAmong = [...new Set(e.splitAmong.map(n => canonName(users, n)))];
  }
  const split = { expenses, updatedAt: Date.now() };
  await env.VOTES_KV.put(SPLIT_KEY, JSON.stringify(split));
  return split;
}
async function saveSplit(env, split) {
  split.updatedAt = Date.now();
  await env.VOTES_KV.put(SPLIT_KEY, JSON.stringify(split));
}

// ---------- users ----------
// One global user list shared by both trips, so people pick their name
// from a dropdown instead of typing it again on every device. Each user
// owns the vote token their votes are recorded under; picking an existing
// user on a new device adopts that token, so their votes show as theirs.
const USERS_KEY = 'users:v1';
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

async function getUsers(env) {
  const raw = await env.VOTES_KV.get(USERS_KEY);
  if (raw) return JSON.parse(raw);
  // First run: build the list from everyone who already voted or was added
  // as a splitwise member, reusing the token from their votes.
  const users = [];
  const add = (name, token) => {
    name = cleanName(name);
    if (name && !users.some(u => sameName(u.name, name))) users.push({ name, token: token || uid(), createdAt: Date.now() });
  };
  for (const key of Object.keys(TRIPS)) {
    const state = await getState(env, TRIPS[key]);
    state.listings.forEach(l => (l.votes || []).forEach(v => add(v.name, v.token)));
    state.members.forEach(m => add(m));
  }
  await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  return users;
}
const publicUsers = users => users.map(u => ({ name: u.name, token: u.token }))
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
// The user list's spelling of a name ("ken" -> "Ken"), or the name as given.
const canonName = (users, name) => (users.find(u => sameName(u.name, name)) || { name }).name;

// Add any names that aren't in the user list yet; returns the list.
async function addUsers(env, names) {
  const users = await getUsers(env);
  let changed = false;
  for (const raw of names) {
    const name = cleanName(raw);
    if (name && !users.some(u => sameName(u.name, name))) {
      users.push({ name, token: uid(), createdAt: Date.now() });
      changed = true;
    }
  }
  if (changed) await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  return users;
}

// Log in as an existing name, or create it. Names are unique (case-insensitive).
async function handleLogin(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const name = cleanName(body.name);
  if (!name) return j({ ok: false, error: '名字是必填的' });
  const users = await getUsers(env);
  let user = users.find(u => sameName(u.name, name));
  if (!user) {
    const token = String(body.token || '').slice(0, 80) || uid();
    user = { name, token: users.some(u => u.token === token) ? uid() : token, createdAt: Date.now() };
    users.push(user);
    await env.VOTES_KV.put(USERS_KEY, JSON.stringify(users));
  }
  // This device may have voted under its own token before logging in as an
  // existing user: move those votes (same name only) onto the user's token.
  const oldToken = String(body.token || '');
  if (oldToken && oldToken !== user.token) {
    for (const key of Object.keys(TRIPS)) {
      const state = await getState(env, TRIPS[key]);
      let changed = false;
      for (const l of state.listings) {
        const votes = l.votes || [];
        if (!votes.some(v => v.token === oldToken && sameName(v.name || '', user.name))) continue;
        const hasUserVote = votes.some(v => v.token === user.token);
        l.votes = votes.flatMap(v => {
          if (v.token !== oldToken || !sameName(v.name || '', user.name)) return [v];
          return hasUserVote ? [] : [{ ...v, token: user.token }];
        });
        changed = true;
      }
      if (changed) await saveState(env, TRIPS[key], state);
    }
  }
  return j({ ok: true, user: { name: user.name, token: user.token }, users: publicUsers(users) });
}

async function handleMemberAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const name = cleanName(body.name);
  if (!name) return j({ ok: false, error: '名字是必填的' });
  const users = await addUsers(env, [name]);
  return j({ ok: true, users: publicUsers(users) });
}

// Validates the fields of an expense being added or edited.
// Returns { error } or { fields, users }.
async function readExpense(body, env) {
  const cents = Math.round(Number(body.amountUSD) * 100);
  if (!isFinite(cents) || cents <= 0) return { error: '金额要大于 0' };
  let paidBy = cleanName(body.paidBy);
  if (!paidBy) return { error: '请选择付款人' };
  let splitAmong = (Array.isArray(body.splitAmong) ? body.splitAmong : []).map(cleanName).filter(Boolean);
  if (!splitAmong.length) return { error: '至少选一个人分摊' };
  // New names join the user list; known names use its spelling so "ken" and "Ken" share one balance.
  const users = await addUsers(env, [paidBy, ...splitAmong]);
  paidBy = canonName(users, paidBy);
  splitAmong = [...new Set(splitAmong.map(n => canonName(users, n)))];
  const description = String(body.description || '').trim().slice(0, 120) || '未命名支出';
  return { users, fields: { description, amountCents: cents, paidBy, splitAmong } };
}

async function handleExpenseAdd(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const { error, fields, users } = await readExpense(body, env);
  if (error) return j({ ok: false, error });
  const split = await getSplit(env);
  const expense = { id: uid(), ...fields, createdAt: Date.now() };
  split.expenses.unshift(expense);
  await saveSplit(env, split);
  return j({ ok: true, expense, users: publicUsers(users), ...splitView(split) });
}

// Fix a wrong description, amount, payer or set of people. The expense keeps
// its id and its place in the list.
async function handleExpenseUpdate(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const split = await getSplit(env);
  const expense = split.expenses.find(e => e.id === body.id);
  if (!expense) return j({ ok: false, error: '支出不存在' });
  const { error, fields, users } = await readExpense(body, env);
  if (error) return j({ ok: false, error });
  Object.assign(expense, fields, { updatedAt: Date.now() });
  await saveSplit(env, split);
  return j({ ok: true, expense, users: publicUsers(users), ...splitView(split) });
}

async function handleExpenseRemove(req, env) {
  let body = {};
  try { body = await req.json(); } catch (e) { /* ignore */ }
  const split = await getSplit(env);
  const i = split.expenses.findIndex(e => e.id === body.id);
  if (i < 0) return j({ ok: false, error: '支出不存在' });
  split.expenses.splice(i, 1);
  await saveSplit(env, split);
  return j({ ok: true, ...splitView(split) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === '/api/state' && request.method === 'GET') {
      // The trip's listings plus the whole group's ledger. members/expenses
      // inside trip state are pre-merge leftovers, kept in KV but not served.
      const { members, expenses, ...state } = await getState(env, tripOf(url.searchParams.get('trip')));
      return j({ ...state, ...splitView(await getSplit(env)) });
    }
    if (p === '/api/split' && request.method === 'GET') return j({ ok: true, ...splitView(await getSplit(env)) });
    if (p === '/api/users' && request.method === 'GET') return j({ ok: true, users: publicUsers(await getUsers(env)) });
    if (p === '/api/login' && request.method === 'POST') return handleLogin(request, env);
    if (p === '/api/add' && request.method === 'POST') return handleAdd(request, env);
    if (p === '/api/add-manual' && request.method === 'POST') return handleAddManual(request, env);
    if (p === '/api/vote' && request.method === 'POST') return handleVote(request, env);
    if (p === '/api/remove' && request.method === 'POST') return handleRemove(request, env);
    if (p === '/api/enrich' && request.method === 'POST') return handleEnrich(request, env);
    if (p === '/api/member' && request.method === 'POST') return handleMemberAdd(request, env);
    if (p === '/api/expense' && request.method === 'POST') return handleExpenseAdd(request, env);
    if (p === '/api/expense-update' && request.method === 'POST') return handleExpenseUpdate(request, env);
    if (p === '/api/expense-remove' && request.method === 'POST') return handleExpenseRemove(request, env);
    return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};
