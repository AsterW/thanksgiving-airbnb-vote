// 投票截止时间的显示：按太平洋时间写，看的人不在太平洋时区时再附上他的本地时间
const WEEK = '日一二三四五六';
function fmt(ms, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return p.month + '/' + p.day + ' 周' + WEEK[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)] + ' ' + p.hour + ':' + p.minute;
}
export function deadlineText(iso) {
  const ms = Date.parse(iso);
  const pt = fmt(ms, 'America/Los_Angeles') + ' 太平洋时间';
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const local = fmt(ms, here);
  return local === fmt(ms, 'America/Los_Angeles') ? pt : pt + '（你那边 ' + local + '）';
}
export function countdown(ms) {
  if (ms <= 0) return '0 秒';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return (d ? d + ' 天 ' : '') + (d || h ? h + ' 小时 ' : '') + m + ' 分 ' + (d ? '' : sec + ' 秒');
}
// 每人分摊：总价 ÷ 行程人数（住不下所有人时也按全组人数分，方便横向比较）
export function perPerson(total, T) {
  if (!total) return null;
  const each = total / T.people;
  return { each: Math.round(each), perNight: Math.round(each / T.nights) };
}
