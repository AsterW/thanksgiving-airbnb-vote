# 技术链条说明：感恩节 Airbnb 投票站

> 这是一个很薄的全栈：**浏览器 → Cloudflare 边缘节点 → Worker（后端）→ KV（数据库）**。
> 前端是 React 单页应用（Vite 构建到 `dist/`），由同一个 Worker 托管，部署在 Cloudflare Workers 免费计划上。

## 整体架构

- **运行平台**：Cloudflare Workers（无服务器，按请求执行，全球边缘节点就近响应）
- **数据库**：Cloudflare KV —— 每段行程一个 key，各存一份 JSON（房源数组），没有传统数据库：
  - `nov25`（11/25–26 · 9人 · 1晚）→ `state:nov25:v1`
  - `nov26`（11/26–29 · 14人 · 3晚）→ `state:v1`（沿用原来的 key，之前的房源和投票都在这里）
  - 全员共用、不分行程：`users:v1`（登录时选的名字，也是分账的成员名单）、`split:v1`（分账，全员一本账）。分账原来按行程存在上面两个 key 里，第一次读 `split:v1` 时自动合并过来（旧数据留在原处不删）
  - 餐厅：每段行程一份，`food:nov25:v1` / `food:nov26:v1`（`{ places: [...] }`，每家有名字、Google 地图链接、坐标、备注、想去的人）
- **Secret Angel**：`angel:v1`（全员一份）。`prefs` 按名字（小写）存每人的礼物偏好（分类 id → `love` / `nope`，加一句备注）；`excluded` 是管理员排除的人；`draw` 是抽签结果（天使 → 要送礼的人）。管理员是名字为 Aster 的用户（`worker/angel/routes.js` 的 `ADMIN`）。抽签把所有参加的人随机排成一个圈，每人送给下一个（`worker/angel/draw.js`），所以不会抽到自己、也不会两人互送。接口只返回调用者自己的那一对。和投票一样，身份靠用户列表里的名字 + token，不是真正的密码登录
- **21 点**：不走 KV，是一个 Durable Object（`BlackjackTable`，SQLite 存储，免费计划只能用这种）。整张桌子的状态在它的内存里，玩家用 WebSocket（`/api/bj`）连上来，每次有变化就把整桌推给所有人。规则和流程在 `BlackjackGame` 里（6 副牌、庄家软 17 停、Blackjack 3:2、头两张可加倍、不分牌不保险；15 秒下注、30 秒一手）。筹码只在玩家站起来或断线时存进它自己的存储（`p:<名字>`），不按局存。坐下要用登录名单里的名字和 token。不在 21 点页面又没坐下的人会断开连接，10 分钟没下注会被站起来，免得白占免费的运行时长
- **域名**：`denver-thanksgiving-airbnb-vote.thanksgiving-vote.workers.dev`（免费子域名）

## 前端（`web/`，React + Vite + Tailwind）

按功能分目录，多人同时开发时尽量不碰同一个文件：

| 目录 | 内容 |
|---|---|
| `web/src/App.jsx` | 外框：开场动画、左侧导航/底部标签栏、标题、四个页面（切走只是藏起来，状态都还在） |
| `web/src/features/hunt/` | 选房：`HuntView`（数据和投票）、`ListingGrid`（卡片换位动画 FLIP + 投票后锚定位置）、`ListingCard`、`Carousel`（照片轮播）、`ListingMap`（Leaflet 地图）、`AddListingForm`、`price.js`（实时价/排序） |
| `web/src/features/food/` | 找餐厅：贴 Google 地图链接加店（`AddPlaceForm`）、店铺卡片（想去 / 在 Google 地图打开 / 导航）、`FoodMap`（Leaflet 钉子） |
| `web/src/features/split/` | 分账：成员、记一笔、余额和结清方案、支出记录（行内修改） |
| `web/src/features/blackjack/` | 21 点：`useBlackjack`（WebSocket 连线、坐下/站起）、牌桌各部分组件 |
| `web/src/session/` | 登录：从用户列表选名字，名字和 token 存在 `localStorage`（`vn` / `vt`） |
| `web/src/components/` | 共用：开场动画、导航、标题、登录框、顶部横幅、照片轮播 `Carousel`（选房和餐厅卡片都用） |
| `web/src/lib/` | 共用：`api()`、行程和页面配置（`TRIPS`、`VIEWS`）、URL hash 路由（`#nov26/split`） |

- 投票后先在原位更新，700ms 后再按新票数重排，卡片滑到新位置，投的那间在屏幕上不动
- 页面每次加载会补抓缺照片/评分/位置的房源，并让后端刷新过期的实时价

## 后端（`worker/`，跑在 Worker 里）

入口 `worker/index.js` 只做一件事：把各功能目录导出的路由表（`routes`）合并起来按「方法 + 路径」分发，其他路径交给 `env.ASSETS` 返回构建好的页面。功能目录：`listings/`（房源、抓取、实时价）、`food/`（餐厅：读 Google 地图链接）、`users/`（用户列表、登录）、`split/`（账本计算和存储）、`blackjack/`（规则 `game.js` 和 Durable Object `table.js`）、`config/`（行程和预置房源）。每个接口都按 `trip`（GET 用 `?trip=`，POST 放在 body 里）选 KV key；不带 `trip` 的请求（比如还开着旧页面的人）默认走 `nov26`，也就是原来那份清单：

| 路由 | 作用 |
|---|---|
| `GET /api/state?trip=…` | 读该行程的 KV；没有就初始化（`nov26` 用 10 间预置房源 seed，`nov25` 从空清单开始） |
| `POST /api/add` | 正则从链接提 roomId（`/rooms/(\d+)`）→ 查重（重复返回 `deduped`）→ 调抓取 → 新房源 `unshift` 到数组头 → 写回 KV |
| `POST /api/add-manual` | 手动表单，走同样入库 |
| `POST /api/vote` / `/api/remove` / `/api/enrich` | 投票、删除、补抓 |
| `GET /api/food?trip=…`、`POST /api/food/add` / `vote` / `remove` | 餐厅（`worker/food/`）。只接受从 Google 地图复制的链接：店名和坐标从链接本身读（`/maps/place/<店名>/…!3d<纬度>!4d<经度>`，或带店铺 id 的 `?q=` 链接），`maps.app.goo.gl` 短链接只跟着跳转展开，不抓 Google 的页面、不按店名搜索；读不出店名就回“找不到这家餐厅”。加店时顺便取最多 10 张照片（`worker/food/photos.js`）：打开链接指向的店铺页，找到 Google 地图自己用的店铺详情请求（`/maps/preview/place?…`），只留类型是照片的（不要街景全景、视频和头像）；取不到就没有照片，店照样加上。之前加的店，页面打开时会补取一次（`POST /api/food/photos`） |
| 其他路径 | `env.ASSETS.fetch(request)` 返回构建好的页面（`dist/`） |

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

## 区域标签页（`worker/listings/zones.js`、`web/src/features/hunt/zones.js`）

每段行程在 `worker/config/trips.js` 里配几个区域（中心点 + 半径 km），名字和前端 `TRIPS.areas` 一致。房源有了位置但没区域时，后端按顺序分：落在配置的区域里（几个都包含就取最小的）→ 25 km 内最近的已分区房源的区域 → OpenStreetMap（Nominatim）反查城镇名，比如 Steamboat Springs，作为新区域。加房源、补抓到位置时当场分；页面加载时 `POST /api/zones` 把还没分的补上（每次最多 8 间，查城镇名间隔 1 秒，符合 Nominatim 的使用规则）。前端标签页 = 配置的区域（固定顺序）+ 房源里出现的其他区域（按数量排）+「未分区」。卡片左上角的区域标签可以点开改（`POST /api/area`），手动改过的（`areaManual`）不会再被自动分。

## 天气（`worker/weather/`、`web/src/features/weather/`）

选房页选中某个区域时（「全部」「未分区」不显示），地图正上方一行显示那里每天的天气 emoji 加最低/最高温。地点是这个区域房源位置的平均值，所以自动起的新区域也有天气。数据来自 Open-Meteo（免费、不用 key）：预报只有未来 16 天，更远的日子用过去 5 年同一天的实际天气代替（最常见的天气 + 平均温度，虚线框标「往年同期」），进了 16 天以内自动换成预报。后端 `GET /api/weather?trip=&lat=&lng=`（经纬度取整到 0.1°，约 10 km）把结果存在 KV（`weather:v1:<经纬度>:<日期>`）大家共用：往年数据永久缓存，预报最多 3 小时刷新一次，所以不管多少人打开页面，Open-Meteo 每天只会被调几次（直接从浏览器调会被限流，试过）。

## 日历（`web/src/features/calendar/`）

纯前端：读各页面已有的接口（每段行程的 `/api/state`、`/api/flights`），在 `agenda.js` 里变成一条条事件再按天（丹佛时间）分组。每种来源一个函数：`stayEvents`（每段行程票数最高的房源：入住 / 住在 / 退房，Airbnb 显示订不了会提醒）、`flightEvents`（某个人的到达和离开航班、谁来接 TA 或 TA 去接谁、全员还车）。可以切换看某个人或所有人。以后餐厅和活动的报名，加一个返回事件的函数、在 `CalendarView` 里合进去就行。

## 航班（`worker/flights/`、`web/src/features/flights/`）

每人填到达和离开航班：航班号、起飞日期、另一头的机场（到达默认飞到 DEN，离开默认从 DEN 走）、起飞和到达的当地时间。没有用付费航班 API，所以航线和时间要自己填（表单上有「查航班时间」链接）。机场列表在 `worker/flights/airports.js`（OpenFlights 数据，5500 个有 IATA 代码的机场，带经纬度和时区，ODbL 协议），`GET /api/airports?q=` 做自动补全。后端用 `Intl` 按两头机场的时区算出 UTC 时间和飞行时长（落地时间比起飞早就是第二天，红眼航班、跨太平洋都能算对），存在 KV `flights:v1`（按名字小写）。也可以帮朋友填，或者勾「不坐飞机」。

页面：航线地图（到达 / 离开分开看，大圆航线，同一航线的人合成一条线，人最多的机场标红）；接机提醒（落地后国内 +40 分钟、国际 +75 分钟到路边，同机场一小时内的合成一趟，可以认领「我来接」）；离开安排（全员一起去机场还租的车，所以整组一个时间：按最早起飞的那班，国内提前 2 小时、国际 3 小时到航站楼，再提前 30 分钟到租车点还车；每人显示到航站楼后要等多久）；「复制接送机安排」生成一段文字贴到群里。这些规则都在 `web/src/features/flights/plan.js`。

## 实时价格（`worker/listings/prices.js`）

Airbnb 房源页的价格框是浏览器单独请求的（GraphQL 持久化查询 `StaysPdpBookItQuery`，带公开的网页 API key）。Worker 用同样的请求，按每段行程的日期和人数查总价和是否可订；人数超过房源上限时按上限再查一次。结果存在房源的 `live` 字段，6 小时内不重复查。查询 hash 或 key 变了会查不到，卡片保留上次的价格并显示多久以前查的。

## 部署（`wrangler.toml`）

声明 worker 名、入口 `worker/index.js`、构建命令（`[build]`：`npm run build` 把前端构建到 `./dist`）、静态目录 `./dist`、KV 绑定（`VOTES_KV` → namespace id）、21 点的 Durable Object。推到 `main` 由 GitHub Action 自动 `npm ci` + `wrangler deploy`；每个 PR 都会跑 `npm run check`（lint + 构建 + 打包 worker）。KV namespace 用 `wrangler kv namespace create` 先建好再把 id 写进 toml。

**部署踩坑清单（2026-10-10）：**

1. 新账号必须先完成邮箱验证，否则非模态 "Verify your account" 弹窗会挡住 Worker 创建和 API token 创建（API 报 10034）。手机上可能看不到弹窗——以 API/机器的返回为准，不以手机 UI 为准
2. `wrangler login` 的 `localhost:8976` OAuth 回调到不了终端（浏览器不在同一台机器）→ 用手动 PKCE：自己生成 verifier/challenge/state → 用户在手机上（已登录 Cloudflare）打开 authorize URL → 把 localhost 回调 URL 粘贴回来 → `POST https://dash.cloudflare.com/oauth2/token` 换 token。注意：该 endpoint 对 Python-urllib UA 返回 403/error 1010，用 Chrome UA 就行
3. `[assets]` 必须声明 `binding = "ASSETS"`（见上方 Error 1101）
4. workers.dev 子域名要先注册：`PUT /accounts/{id}/workers/subdomain {"subdomain": name}`
5. 浏览器任务从 muse.ai 文件链接下载文件会被组织策略拦截——直接把代码粘贴进任务消息里更可靠
