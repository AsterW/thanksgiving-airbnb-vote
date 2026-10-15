// Quick polls (worker/polls): creation validation, one vote per
// account with changes allowed while live, creator-only closing, and
// a simultaneous-vote storm whose counts must come out exact — the
// whole feature is friends tapping at the same second.
// Standalone use: TEST_BASE=http://localhost:8791 node tests/robustness/polls.mjs
const B = process.env.TEST_BASE || 'http://localhost:8791';
const J = async (m, p, o) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: o === undefined ? undefined : JSON.stringify(o) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* ignore */ }
  return j;
};
let pass = 0, fail = 0;
const ck = (name, cond, extra) => { if (cond) { pass++; console.log('OK  ', name); } else { fail++; console.log('FAIL', name, extra ?? ''); } };
const tag = Date.now().toString(36);
const mk = async n => { const r = await J('POST', '/api/login', { name: n + tag, token: 'dev-' + n + '-' + tag }); return { name: r.user?.name, token: r.user?.token }; };

const A = await mk('PollAnn'), Bv = await mk('PollBob'), C = await mk('PollCat');
ck('three poll users created', !!(A.token && Bv.token && C.token));

// ---- creation validation ----
const anon = await J('POST', '/api/polls', { q: '匿名能发吗', options: ['能', '不能'] });
ck('create without login rejected', anon.ok === false, JSON.stringify(anon));
const one = await J('POST', '/api/polls', { name: A.name, token: A.token, q: '只有一个选项', options: ['就它'] });
ck('one option rejected', one.ok === false, JSON.stringify(one));
const five = await J('POST', '/api/polls', { name: A.name, token: A.token, q: '五个选项', options: ['1', '2', '3', '4', '5'] });
ck('five options rejected', five.ok === false, JSON.stringify(five));
const dup = await J('POST', '/api/polls', { name: A.name, token: A.token, q: '重复选项', options: ['火锅', '火锅'] });
ck('duplicate options rejected', dup.ok === false, JSON.stringify(dup));
const badImg = await J('POST', '/api/polls', { name: A.name, token: A.token, q: '图裂了', options: ['甲', '乙'], img: 'notaurl' });
ck('non-http image rejected', badImg.ok === false, JSON.stringify(badImg));

// ---- a real poll ----
const made = await J('POST', '/api/polls', { name: A.name, token: A.token, q: '周五吃啥', options: ['火锅', '烤肉'], durationMin: 10, img: 'https://example.com/hotpot.jpg' });
const poll = made.polls?.find(p => p.q === '周五吃啥');
ck('poll created active with image', !!poll && poll.status === 'active' && poll.img.includes('hotpot'), JSON.stringify(made).slice(0, 300));
ck('timed poll has an endsAt ~10min out', !!poll && Math.abs(poll.endsAt - Date.now() - 600000) < 60000, String(poll?.endsAt));
const [hot, bbq] = poll.options;

// ---- voting: one per account, changeable ----
const ghost = await J('POST', '/api/polls/vote', { name: Bv.name, token: 'bogus', pollId: poll.id, optionId: hot.id });
ck('vote with a bogus token rejected', ghost.ok === false, JSON.stringify(ghost));
const v1 = await J('POST', '/api/polls/vote', { name: Bv.name, token: Bv.token, pollId: poll.id, optionId: hot.id });
ck('B votes 火锅', v1.polls.find(p => p.id === poll.id)?.options.find(o => o.id === hot.id)?.count === 1, JSON.stringify(v1).slice(0, 300));
const v2 = await J('POST', '/api/polls/vote', { name: C.name, token: C.token, pollId: poll.id, optionId: bbq.id });
const after2 = v2.polls.find(p => p.id === poll.id);
ck('C votes 烤肉， 两边各一票', after2.total === 2 && after2.options.every(o => o.count === 1), JSON.stringify(after2));
ck('voter names are public', after2.options.find(o => o.id === hot.id).voters.some(n => n.toLowerCase() === Bv.name.toLowerCase()), JSON.stringify(after2.options));
const v3 = await J('POST', '/api/polls/vote', { name: Bv.name, token: Bv.token, pollId: poll.id, optionId: bbq.id });
const after3 = v3.polls.find(p => p.id === poll.id);
ck('B changes vote: 火锅 0 / 烤肉 2', after3.options.find(o => o.id === hot.id).count === 0 && after3.options.find(o => o.id === bbq.id).count === 2 && after3.total === 2, JSON.stringify(after3));
const badOpt = await J('POST', '/api/polls/vote', { name: Bv.name, token: Bv.token, pollId: poll.id, optionId: 'nope' });
ck('vote for a missing option rejected', badOpt.ok === false, JSON.stringify(badOpt));

// ---- storm: eight friends tap at once, counts must be exact ----
const storm = await J('POST', '/api/polls', { name: A.name, token: A.token, q: '风暴测试', options: ['左', '右'] });
const sp = storm.polls.find(p => p.q === '风暴测试');
const crowd = await Promise.all(Array.from({ length: 8 }, (_, i) => mk('Storm' + i)));
await Promise.all(crowd.map((u, i) => J('POST', '/api/polls/vote', { name: u.name, token: u.token, pollId: sp.id, optionId: sp.options[i % 2].id })));
const settled = (await J('GET', `/api/polls?name=${encodeURIComponent(A.name)}&token=${encodeURIComponent(A.token)}`)).polls.find(p => p.id === sp.id);
ck('storm: all 8 votes landed, 4/4 split', settled.total === 8 && settled.options.every(o => o.count === 4), JSON.stringify(settled));

// ---- closing: creator only, then voting stops ----
const closeByOther = await J('POST', '/api/polls/close', { name: Bv.name, token: Bv.token, pollId: poll.id });
ck('close by a non-creator rejected', closeByOther.ok === false, JSON.stringify(closeByOther));
const closed = await J('POST', '/api/polls/close', { name: A.name, token: A.token, pollId: poll.id });
ck('creator closes the poll', closed.polls.find(p => p.id === poll.id)?.status === 'closed', JSON.stringify(closed).slice(0, 200));
const lateVote = await J('POST', '/api/polls/vote', { name: C.name, token: C.token, pollId: poll.id, optionId: hot.id });
ck('vote after close rejected', lateVote.ok === false, JSON.stringify(lateVote));

// ---- anonymous read works, with no "my vote" ----
const pub = await J('GET', '/api/polls');
ck('public GET lists polls without myVote', pub.ok === true && pub.polls.length >= 2 && pub.polls.every(p => p.myVote === null), JSON.stringify(pub).slice(0, 200));

console.log(`\npolls suite: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
