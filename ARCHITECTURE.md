# 技术链条说明：感恩节 Airbnb 投票站

> 这是一个很薄的全栈：**浏览器 → Cloudflare 边缘节点 → Worker（后端）→ KV（数据库）**。
> 前端是单个静态页面，部署在 Cloudflare Workers 免费计划上。

## 整体架构

- **运行平台**：Cloudflare Workers（无服务器，按请求执行，全球边缘节点就近响应）
- **数据库**：Cloudflare KV —— 每段行程一个 key，各存一份 JSON（房源数组），没有传统数据库：
  - `nov25`（11/25–26 · 9人 · 1晚）→ `state:nov25:v1`
  - `nov26`（11/26–29 · 14人 · 3晚）→ `state:v1`（沿用原来的 key，之前的房源和投票都在这里）
- **域名**：`denver-thanksgiving-airbnb-vote.thanksgiving-vote.workers.dev`（免费子域名）

## 前端（`public/index.html`，一个文件）

- 没用框架，**原生 JS + Tailwind CSS**（CDN 引入，写 class 名就行，不用构建）
- 核心函数：
  - `api()`：封装 `fetch` 调后端接口
  - `render()` / `card()`：把房源数组拼成卡片 HTML。卡片含：照片、区域标签、右上 ✕ 删除按钮、标题、「X卧·X床·X卫·可住X人」、价格、⭐评分、备注、投票人小标签、投票按钮、「去 Airbnb ↗」外链
  - `renderTrip()` / `switchTrip()`：顶部两个标签页对应两段行程（配置在 `TRIPS`：日期、人数、晚数、区域）。当前标签页记在 URL hash（`#nov25` / `#nov26`），可以直接分享某个标签页的链接
  - `celebrate()`：投票成功后的庆祝动画——从投票按钮炸开彩带和爱心、两侧礼炮、顶部横幅（[canvas-confetti](https://github.com/catdad/canvas-confetti)，CDN 引入）。系统开了「减少动态效果」就只显示横幅；取消投票不触发
- **按行程区分**：所有接口都带 `trip`；「去 Airbnb ↗」按当前标签页的日期和人数拼链接（打开就是实时总价）；可住人数不够的房源显示 ⚠️ 提醒；手动填的价格会记下 `priceNights`，老的预置房源没有这个字段，按 4 晚显示（它们是 11/25–29 的快照）
- **身份（没做登录）**：第一次打开在 `localStorage` 生成随机 token（`vt`），投票时弹窗问名字（`vn`，只问一次）。点投票 = 把 `{token, name}` 推进房源的 `votes` 数组；再点一次 = 按 token 删掉（toggle）。所以清浏览器缓存就能换身份重投——熟人群里用，简单优先，防刷基本靠自觉
- **加房源**：POST 链接 → 成功直接进列表；失败自动展开手动表单（URL 已预填）
- 页面每次加载跑 `enrichMissing()`：没照片或没评分的房源自动调接口补全

## 后端（`worker.js`，跑在 Worker 里）

入口是 `fetch(request, env)`，按路径分发。每个接口都按 `trip`（GET 用 `?trip=`，POST 放在 body 里）选 KV key；不带 `trip` 的请求（比如还开着旧页面的人）默认走 `nov26`，也就是原来那份清单：

| 路由 | 作用 |
|---|---|
| `GET /api/state?trip=…` | 读该行程的 KV；没有就初始化（`nov26` 用 10 间预置房源 seed，`nov25` 从空清单开始） |
| `POST /api/add` | 正则从链接提 roomId（`/rooms/(\d+)`）→ 查重（重复返回 `deduped`）→ 调抓取 → 新房源 `unshift` 到数组头 → 写回 KV |
| `POST /api/add-manual` | 手动表单，走同样入库 |
| `POST /api/vote` / `/api/remove` / `/api/enrich` | 投票、删除、补抓 |
| 其他路径 | `env.ASSETS.fetch(request)` 返回静态 `index.html` |

⚠️ 踩过的坑：`wrangler.toml` 的 `[assets]` 必须声明 `binding = "ASSETS"`，否则 `env.ASSETS` 是 `undefined`，首页报 Error 1101 而 `/api/*` 还正常。

## 抓取链条（`fetchListingInfo`，最折腾的部分）

Airbnb 会拦机房 IP（给 worker 返回机器人验证墙），所以做了三级 fallback，全程伪装 Chrome UA：

1. **直接抓用户给的 URL** → 解析：
   - `<title>` 取真实标题（去掉 " - Houses for Rent…" 后缀）
   - `og:image` 取图片
   - 正则抓卧室/床/浴室/可住人数
   - JSON-LD 里 `aggregateRating` 取评分和评价数（比 ★ 符号可靠）
2. **失败 → 抓 `airbnb.co.uk` 同房源页**：实测 `.com` 给机器人墙，`.co.uk` 直接给真页面
3. **再失败 → 走 r.jina.ai 阅读器代理**，转成 markdown 解析（`#` 标题、muscache 图片链接）
4. 都失败 → 返回 `ok: false`，前端弹手动表单

## 价格为什么是静态的

Airbnb 的 4 晚总价是前端 JS 按日期/人数动态算的，静态 HTML 里没有可靠数字。所以站内价格只是 2026-09-30 核实的快照（预置房源）或手动填的；新抓的房源显示「价格以 Airbnb 页面为准」。

## 部署（`wrangler.toml`）

声明 worker 名、入口文件、静态目录 `./public`、KV 绑定（`VOTES_KV` → namespace id）。`wrangler deploy` 一把梭；KV namespace 用 `wrangler kv namespace create` 先建好再把 id 写进 toml。

**部署踩坑清单（2026-10-10）：**

1. 新账号必须先完成邮箱验证，否则非模态 "Verify your account" 弹窗会挡住 Worker 创建和 API token 创建（API 报 10034）。手机上可能看不到弹窗——以 API/机器的返回为准，不以手机 UI 为准
2. `wrangler login` 的 `localhost:8976` OAuth 回调到不了终端（浏览器不在同一台机器）→ 用手动 PKCE：自己生成 verifier/challenge/state → 用户在手机上（已登录 Cloudflare）打开 authorize URL → 把 localhost 回调 URL 粘贴回来 → `POST https://dash.cloudflare.com/oauth2/token` 换 token。注意：该 endpoint 对 Python-urllib UA 返回 403/error 1010，用 Chrome UA 就行
3. `[assets]` 必须声明 `binding = "ASSETS"`（见上方 Error 1101）
4. workers.dev 子域名要先注册：`PUT /accounts/{id}/workers/subdomain {"subdomain": name}`
5. 浏览器任务从 muse.ai 文件链接下载文件会被组织策略拦截——直接把代码粘贴进任务消息里更可靠
