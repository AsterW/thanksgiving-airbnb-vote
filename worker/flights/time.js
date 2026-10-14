// Local airport time <-> UTC using the runtime's time zone data (Intl), no libraries.

// Minutes a time zone is ahead of UTC at a given instant.
function offsetMin(utcMs, tz) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(utcMs));
  const g = t => Number(p.find(x => x.type === t).value);
  return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - utcMs) / 60000;
}

// "2026-11-25" + "14:10" at an airport's time zone -> UTC milliseconds.
export function localToUtc(date, time, tz) {
  const naive = Date.parse(date + 'T' + time + ':00Z');
  let utc = naive - offsetMin(naive, tz) * 60000;
  utc = naive - offsetMin(utc, tz) * 60000; // second pass settles DST edges
  return utc;
}

// UTC milliseconds -> "YYYY-MM-DD" date at a time zone.
export function utcToLocalDate(utcMs, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utcMs));
}
