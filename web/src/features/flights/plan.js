// 接机 / 送机安排：纯函数，只看航班数据，方便测试。
// 接机：落地后到路边要一段时间（国内 ~40 分钟拿行李，国际 ~75 分钟过海关），
//      同一个机场 60 分钟内陆续到路边的人合成一趟去接。
// 离开：全员一起去机场还租的车，所以是整组一个时间——按最早起飞的那班倒推：
//      国内航班起飞前 2 小时、国际 3 小时到航站楼，再提前 30 分钟到租车点还车、坐摆渡车。
export const CURB_MIN = { domestic: 40, international: 75 };
export const AIRPORT_EARLY_MIN = { domestic: 120, international: 180 };
export const CAR_RETURN_MIN = 30;
const PICKUP_WINDOW_MIN = 60;
const MIN = 60000;

// 按时间把相近的人分成一趟：同一个机场、离这一趟第一个人 window 分钟以内
function cluster(items, windowMin) {
  const runs = [];
  const sorted = [...items].sort((a, b) => a.airport.iata.localeCompare(b.airport.iata) || a.t - b.t);
  for (const it of sorted) {
    const run = runs[runs.length - 1];
    if (run && run.airport.iata === it.airport.iata && it.t - run.first <= windowMin * MIN) run.items.push(it);
    else runs.push({ airport: it.airport, first: it.t, items: [it] });
  }
  return runs.sort((a, b) => a.first - b.first);
}

// [{ airport, items: [{ name, f, t: 到路边时间 }], pickupAt, pickupBy: [...] }]，按时间排
export function pickupRuns(people) {
  const items = people.filter(p => p.arrival).map(p => ({
    name: p.name, f: p.arrival, airport: p.arrival.to, pickupBy: p.pickupBy,
    t: p.arrival.arrUtc + CURB_MIN[p.arrival.international ? 'international' : 'domestic'] * MIN,
  }));
  return cluster(items, PICKUP_WINDOW_MIN).map(r => ({ ...r, pickupAt: Math.max(...r.items.map(i => i.t)) }));
}

// 每个起飞机场一组（一般就是 DEN 一组）：
// [{ airport, items: [{ name, f, t: 这班最晚到航站楼时间 }], terminalBy: 全员到航站楼, arriveBy: 全员到租车点还车 }]
export function departureRuns(people) {
  const groups = new Map();
  for (const p of people.filter(x => x.departure)) {
    const f = p.departure;
    const item = { name: p.name, f, airport: f.from, t: f.depUtc - AIRPORT_EARLY_MIN[f.international ? 'international' : 'domestic'] * MIN };
    if (!groups.has(f.from.iata)) groups.set(f.from.iata, []);
    groups.get(f.from.iata).push(item);
  }
  return [...groups.values()].map(items => {
    items.sort((a, b) => a.f.depUtc - b.f.depUtc);
    const terminalBy = Math.min(...items.map(i => i.t));
    return { airport: items[0].airport, first: terminalBy, items, terminalBy, arriveBy: terminalBy - CAR_RETURN_MIN * MIN };
  }).sort((a, b) => a.arriveBy - b.arriveBy);
}

// 某个机场当地时间："11/25 周三 14:10"
const WEEK = '日一二三四五六';
export function localTime(ms, tz, withDay = true) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return (withDay ? p.month + '/' + p.day + ' 周' + WEEK[wd] + ' ' : '') + p.hour + ':' + p.minute;
}
export const duration = m => Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '');

// 复制到群里的提醒文字
export function reminderText(pickups, departures) {
  const lines = ['✈️ 接送机安排'];
  if (pickups.length) lines.push('', '🛬 接机');
  for (const r of pickups) {
    lines.push(localTime(r.pickupAt, r.airport.tz) + ' 到 ' + r.airport.iata + ' 接：' + r.items.map(i => i.name + '（' + i.f.flight + ' ' + localTime(i.f.arrUtc, r.airport.tz, false) + ' 落地）').join('、')
      + (r.items.some(i => i.pickupBy) ? ' · 司机：' + [...new Set(r.items.map(i => i.pickupBy).filter(Boolean))].join('、') : ' · 还没人认领'));
  }
  if (departures.length) lines.push('', '🛫 离开（全员一起去机场还车）');
  for (const r of departures) {
    lines.push(localTime(r.arriveBy, r.airport.tz) + ' 前到 ' + r.airport.iata + ' 租车点还车，' + localTime(r.terminalBy, r.airport.tz, false) + ' 前到航站楼');
    for (const i of r.items) lines.push('  ' + i.name + '：' + i.f.flight + ' ' + localTime(i.f.depUtc, r.airport.tz, false) + ' 起飞');
  }
  return lines.join('\n');
}
