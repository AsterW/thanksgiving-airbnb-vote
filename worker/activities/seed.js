// The first batch of activity candidates: 20 picks gathered from local
// media roundups (CPR, 5280), Visit Denver / Visit Estes Park, travel
// guides and community reviews, matched to the group's three bases
// (Denver, Estes Park / Rocky Mountain, Great Sand Dunes) for
// Nov 25-29. `url` is the venue's own site — the card's ↗ button goes
// there. `source` names where the recommendation came from.
// Dates are for the 2026 season where the venue has announced them;
// anything seasonal should be re-checked on the venue site before booking.
export const SEED = [
  // ---- Denver 市区 ----
  { id: 'christkindlmarket', emoji: '🎄', area: 'Denver 市区',
    title: 'Christkindlmarket 德国圣诞市集',
    blurb: 'Tivoli Quad 的德式圣诞市集，2026 年 11月20日–12月23日，免费入场。热红酒、椒盐脆饼和手作小摊都在，旁边的 Mile High Tree 每晚有灯光秀，19:00 还有免费无人机表演。感恩节当天 11:00–16:00 也营业。',
    url: 'https://www.christkindlmarketdenver.com/', source: 'CPR · Visit Denver' },
  { id: 'blossoms-of-light', emoji: '✨', area: 'Denver 市区',
    title: 'Blossoms of Light · 植物园灯展',
    blurb: 'Denver Botanic Gardens 的招牌灯展，11月20日–1月10日 16:30–21:00。注意感恩节当天（11月26日）闭园，我们只有 11月25日晚上能去；定时票只能提前在官网买，现场不售票。',
    url: 'https://www.botanicgardens.org/events/public-events/blossoms-light', source: 'Denver Botanic Gardens' },
  { id: 'zoo-lights', emoji: '🦁', area: 'Denver 市区',
    title: 'Zoo Lights · 动物园灯会',
    blurb: 'Denver Zoo 的灯会：80 英亩、300 多万盏灯的动物造型灯组，还有现场冰雕表演。往年 11 月下旬开始，感恩节当天闭园，门票提前网上买。',
    url: 'https://denverzoo.org/events/zoolights/', source: 'CPR · Denver Zoo' },
  { id: 'meow-wolf', emoji: '🌀', area: 'Denver 市区',
    title: 'Meow Wolf · Convergence Station',
    blurb: '四层楼、70 多个房间的沉浸式异世界艺术展，Denver 最出片的室内景点之一，下雪天也不怕。门票建议提前在官网订好时段。',
    url: 'https://meowwolf.com/visit/denver', source: '网友口碑热推' },
  { id: 'denver-art-museum', emoji: '🎨', area: 'Denver 市区',
    title: 'Denver Art Museum',
    blurb: 'Libeskind 设计的钛合金大楼本身就是地标，北美原住民艺术和西部艺术收藏是强项。天气冷的时候躲室内刚好，周二开到 20:00。',
    url: 'https://www.denverartmuseum.org/en', source: 'Visit Denver' },
  { id: 'mca-denver', emoji: '🖼️', area: 'Denver 市区',
    title: 'MCA Denver · 当代艺术馆',
    blurb: '小而精的当代艺术博物馆，展览换得勤，还有屋顶咖啡露台。可以和 RiNo 的涂鸦街区排在半天一起逛。',
    url: 'https://mcadenver.org/', source: 'MCA Denver' },
  { id: 'union-station', emoji: '🚉', area: 'Denver 市区',
    title: 'Union Station · 联合车站圣诞季',
    blurb: 'Denver 的“客厅”：大厅圣诞布置、40 英尺圣诞树，晚上还有 Merry & Bright 灯光秀。点灯仪式一般在感恩节后的周五傍晚，就算赶不上点灯，夜景也值得专程去坐坐、喝一杯。',
    url: 'https://www.denverunionstation.com/events/grand-illumination-2025/', source: '5280 · Union Station' },

  // ---- Denver 周边 ----
  { id: 'red-rocks', emoji: '🪨', area: 'Denver 周边',
    title: 'Red Rocks · 红石公园',
    blurb: '白天免费开放：走 1.4 英里的 Trading Post Trail 近看红色巨石，再去游客中心看科罗拉多音乐名人堂。从 Denver 开车约 25 分钟。',
    url: 'http://www.redrocksonline.com/concerts-events/calendar', source: 'Uncover Colorado' },
  { id: 'polar-express', emoji: '🚂', area: 'Denver 周边',
    title: 'Polar Express · 北极特快（Golden）',
    blurb: 'Colorado Railroad Museum 的沉浸式圣诞火车秀：热巧克力歌舞表演 + 蒸汽火车去“北极”见圣诞老人，全程约 90 分钟。11月6日–12月23日的部分日期有场次，感恩节前折扣，票很抢手。',
    url: 'https://coloradorailroadmuseum.org/polar-express/', source: 'Colorado Railroad Museum' },
  { id: 'georgetown-loop', emoji: '🎅', area: 'Denver 周边',
    title: 'Georgetown Loop · 圣诞小火车',
    blurb: '百年窄轨小火车夜游 Santa\u2019s Lighted Forest：沿途 30 多万盏灯，圣诞老人陪坐，全程约 1 小时。11月6日–12月24日，沿 I-70 从 Denver 过去约 1 小时。',
    url: 'https://www.georgetownlooprr.com/events/', source: 'Georgetown Loop Railroad' },
  { id: 'indian-hot-springs', emoji: '🧖', area: 'Denver 周边',
    title: 'Indian Hot Springs · 爱达荷温泉',
    blurb: 'Denver 以西约 35 分钟、紧挨 I-70 的老牌温泉：地热洞穴浴，加上棕榈树环绕的室内矿泉泳池。爬山滑雪之后泡一泡最舒服。',
    url: 'https://www.indianhotsprings.com/', source: 'Colorado.com' },
  { id: 'breckenridge', emoji: '⛷️', area: 'Denver 周边',
    title: 'Breckenridge · 滑雪一日游',
    blurb: '11 月中旬就开季的老牌雪场小镇，BreckConnect 缆车免费上山；不滑雪也可以逛 Main Street。从 Denver 约 1.5–2 小时车程，开放雪道看当周雪况。',
    url: 'https://gobreck.com/experience-breckenridge/breckenridge-ski-resort/', source: 'GoBreck · Vail Resorts' },

  // ---- 落基山 · Estes Park ----
  { id: 'bear-lake-snowshoe', emoji: '🥾', area: '落基山 · Estes Park',
    title: '熊湖雪鞋徒步 · Bear Lake → Dream Lake',
    blurb: '落基山国家公园冬季经典线：从结冰的 Bear Lake 一路走到 Nymph Lake、Dream Lake。11 月底免预约入园，雪鞋在 Estes Park 镇上的户外店就能租。',
    url: 'https://nps.gov/romo/planyourvisit/winter-recreation.htm', source: 'Matador · NPS' },
  { id: 'hidden-valley-sledding', emoji: '🛷', area: '落基山 · Estes Park',
    title: 'Hidden Valley · 滑雪橇',
    blurb: '国家公园里唯一允许滑雪橇的山坡，老滑雪场改成的缓坡，自带一个塑料雪橇就能玩。雪况看天气，出发前先看 NPS 的 sledding conditions。',
    url: 'https://nps.gov/romo/planyourvisit/winter-recreation.htm', source: 'NPS' },
  { id: 'stanley-hotel-tour', emoji: '👻', area: '落基山 · Estes Park',
    title: 'Stanley Hotel · 《闪灵》导览',
    blurb: '启发 Stephen King 写下《闪灵》的白色大酒店：有专门的 Shining Tour 和夜间鬼故事导览，约 60 分钟。票很容易售罄，务必提前在官网订。',
    url: 'https://www.stanleyhotel.com/tours/', source: 'Visit Estes Park' },
  { id: 'rmnp-guided-tour', emoji: '🚙', area: '落基山 · Estes Park',
    title: 'RMNP 冬季包车导览',
    blurb: '不想自己开雪路就跟本地向导：Estes Park 的向导公司有半日/一日冬季团，包接送和雪鞋，带看结冰瀑布、熊湖和高山风景，路上还能找麋鹿。',
    url: 'https://www.kirksflyshop.com/blog/things-to-do-in-rocky-mountain-national-park-in-winter/', source: 'Kirks Flyshop 冬季指南' },

  // ---- Colorado Springs · 南下顺路 ----
  { id: 'garden-of-the-gods', emoji: '🌄', area: 'Colorado Springs · 南下顺路',
    title: 'Garden of the Gods · 众神花园',
    blurb: '免费的红色砂岩巨石公园，远景就是 Pikes Peak；环线步道轻松好走。从 Denver 南下去大沙丘正好经过，停 1–2 小时刚好。',
    url: 'https://gardenofgods.com/', source: 'Colorado Springs 市政府' },

  // ---- 大沙丘区域 ----
  { id: 'dunes-sand-sled', emoji: '🏂', area: '大沙丘区域',
    title: '大沙丘滑沙',
    blurb: '在北美最高的沙丘上玩滑沙板/沙橇。公园里不租装备：入口外的 Oasis（深秋可能歇业，先电话确认）或 Alamosa 的 Kristi Mountain Sports 租，记得拿蜡。11 月正值适宜季节（5–11 月），人少沙也凉。',
    url: 'https://www.nps.gov/grsa/planyourvisit/conditions.htm?fullweb=1', source: 'NPS · 5280' },
  { id: 'dunes-stargazing', emoji: '🌌', area: '大沙丘区域',
    title: '大沙丘观星',
    blurb: '国际暗夜公园，公园 24 小时开放。11 月底天黑得早，吃完晚饭就能看星空；带上红光手电、穿暖和，避开满月的日子最好。',
    url: 'https://www.nps.gov/grsa/planyourvisit/conditions.htm?fullweb=1', source: 'Earth Trekkers · NPS' },
  { id: 'zapata-falls', emoji: '💧', area: '大沙丘区域',
    title: 'Zapata Falls · 扎帕塔瀑布',
    blurb: '沙丘南边的小徒步，往返约 0.8 英里：瀑布藏在岩洞里，最后一段要踩着浅水走进去；冬天瀑布结冰是另一番景象。顺路 30–45 分钟搞定。',
    url: 'http://www.alamosa.org/things-to-do-in-alamosa/alamosa-scenic-wonders/389-zapata-falls', source: 'Visit Alamosa' },
];

// Display order for the area groups on the page.
export const AREA_ORDER = ['Denver 市区', 'Denver 周边', '落基山 · Estes Park', 'Colorado Springs · 南下顺路', '大沙丘区域'];
