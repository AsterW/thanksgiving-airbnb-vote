// 接机 / 送机安排：纯函数，只看航班数据，方便测试。
// 接机：落地后到路边要一段时间（国内 ~40 分钟拿行李，国际 ~75 分钟过海关），
//      同一个机场 60 分钟内陆续到路边的人合成一趟去接。
// 送机：国内航班建议起飞前 2 小时到机场，国际 3 小时；同一个机场 90 分钟内要到的人可以拼一辆车。
export const CURB_MIN = { domestic: 40, international: 75 };
export const AIRPORT_EARLY_MIN = { domestic: 120, international: 180 };
const PICKUP_WINDOW_MIN = 60, RIDE_WINDOW_MIN = 90;
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

// [{ airport, items: [{ name, f, t: 最晚到机场时间 }], leaveBy }]：一起走的话按最早那个人的时间到
export function departureRuns(people) {
  const items = people.filter(p => p.departure).map(p => ({
    name: p.name, f: p.departure, airport: p.departure.from,
    t: p.departure.depUtc - AIRPORT_EARLY_MIN[p.departure.international ? 'international' : 'domestic'] * MIN,
  }));
  return cluster(items, RIDE_WINDOW_MIN).map(r => ({ ...r, arriveBy: Math.min(...r.items.map(i => i.t)) }));
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
  if (departures.length) lines.push('', '🛫 送机');
  for (const r of departures) {
    lines.push(localTime(r.arriveBy, r.airport.tz) + ' 前到 ' + r.airport.iata + '：' + r.items.map(i => i.name + '（' + i.f.flight + ' ' + localTime(i.f.depUtc, r.airport.tz, false) + ' 起飞）').join('、'));
  }
  return lines.join('\n');
}
