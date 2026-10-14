// Email binding + code-login flow, end to end. Requires the server to
// run with EMAIL_DEV_MODE=1 (codes come back in API responses instead of
// being emailed — see worker/users/auth.js). run.mjs sets that variable
// for the local test instance; production never has it.
//
// Standalone use: start `wrangler dev --var EMAIL_DEV_MODE:1`, then
//   TEST_BASE=http://localhost:8791 node tests/robustness/email.mjs
const B = process.env.TEST_BASE || 'http://localhost:8791';
const J = async (m, p, o) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: o === undefined ? undefined : JSON.stringify(o) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* ignore */ }
  return j;
};
let pass = 0, fail = 0;
const ck = (name, cond, extra) => { if (cond) { pass++; console.log('OK  ', name); } else { fail++; console.log('FAIL', name, extra ?? ''); } };
const tag = Date.now().toString(36);
const NAME = 'Bind' + tag, OTHER = 'Other' + tag;
const EMAIL = `tester+${tag}@example.com`; // unique per run: rerunnable on a dirty state dir

const login = await J('POST', '/api/login', { name: NAME, token: 'device-tok-1' });
const tok1 = login.user.token;
ck('create user returns token', !!tok1);
const users1 = await J('GET', '/api/users');
ck('unbound token visible in list', users1.users.find(u => u.name === NAME)?.token === tok1);

const badMail = await J('POST', '/api/auth/send-code', { name: NAME, token: tok1, email: 'not-an-email', purpose: 'bind' });
ck('bad email format rejected', badMail.ok === false, JSON.stringify(badMail));
const noTok = await J('POST', '/api/auth/send-code', { name: NAME, token: 'wrong-token', email: EMAIL, purpose: 'bind' });
ck('bind without the account token rejected', noTok.ok === false, JSON.stringify(noTok));

const send1 = await J('POST', '/api/auth/send-code', { name: NAME, token: tok1, email: `Tester+${tag}@Example.com`, purpose: 'bind' });
ck('bind send-code ok + devCode', send1.ok && /^\d{6}$/.test(send1.devCode || ''), JSON.stringify(send1));
ck('email stored normalized (hint masked)', send1.emailHint === 't•••@example.com', send1.emailHint);

const sendFast = await J('POST', '/api/auth/send-code', { name: NAME, token: tok1, email: EMAIL, purpose: 'bind' });
ck('resend within 60s blocked', sendFast.ok === false && /等 \d+ 秒/.test(sendFast.error || ''), JSON.stringify(sendFast));

const wrong = await J('POST', '/api/auth/verify', { name: NAME, code: send1.devCode === '000000' ? '111111' : '000000', purpose: 'bind' });
ck('wrong code rejected', wrong.ok === false, JSON.stringify(wrong));
const ver = await J('POST', '/api/auth/verify', { name: NAME, code: send1.devCode, purpose: 'bind' });
ck('bind verify ok', ver.ok && ver.email === EMAIL, JSON.stringify(ver));
ck('bind rotated the token', ver.user.token && ver.user.token !== tok1);

const users2 = await J('GET', '/api/users');
const listed = users2.users.find(u => u.name === NAME);
ck('bound user token hidden in list', listed && !('token' in listed) && listed.emailBound === true, JSON.stringify(listed));

const need = await J('POST', '/api/login', { name: NAME, token: tok1 });
ck('login with stale token -> needCode', need.ok && need.needCode === true, JSON.stringify(need));
const need2 = await J('POST', '/api/login', { name: NAME, token: 'fresh-device' });
ck('login from new device -> needCode', need2.needCode === true);
const direct = await J('POST', '/api/login', { name: NAME, token: ver.user.token });
ck('login with real token -> no code needed', direct.ok && direct.user?.token === ver.user.token, JSON.stringify(direct));

const send2 = await J('POST', '/api/auth/send-code', { name: NAME, purpose: 'login' });
ck('login send-code ok', send2.ok && /^\d{6}$/.test(send2.devCode || ''), JSON.stringify(send2));
const ver2 = await J('POST', '/api/auth/verify', { name: NAME, code: send2.devCode, purpose: 'login', deviceToken: 'fresh-device' });
ck('login verify returns the token', ver2.ok && ver2.user.token === ver.user.token, JSON.stringify(ver2));
const reuse = await J('POST', '/api/auth/verify', { name: NAME, code: send2.devCode, purpose: 'login' });
ck('code cannot be reused', reuse.ok === false, JSON.stringify(reuse));

const other = await J('POST', '/api/login', { name: OTHER, token: 'device-tok-2' });
const dup = await J('POST', '/api/auth/send-code', { name: OTHER, token: other.user.token, email: EMAIL, purpose: 'bind' });
ck('email taken by another user rejected', dup.ok === false && /已经绑给别人/.test(dup.error || ''), JSON.stringify(dup));
const noMail = await J('POST', '/api/auth/send-code', { name: OTHER, purpose: 'login' });
ck('login code for unbound user rejected', noMail.ok === false, JSON.stringify(noMail));
const unboundLogin = await J('POST', '/api/login', { name: OTHER, token: 'whatever' });
ck('unbound user login unchanged', unboundLogin.ok && !!unboundLogin.user.token && !unboundLogin.needCode, JSON.stringify(unboundLogin));

// Duplicate-vote regression: a vote belongs to the account, not the token.
// Binding rotates the token; voting again must not stack a second vote,
// and unvoting with the new token (no name sent) must still clear it.
const V = 'Voter' + tag;
const vLogin = await J('POST', '/api/login', { name: V, token: 'voter-tok-a' });
const vTokA = vLogin.user.token;
await J('POST', '/api/add', { url: 'https://www.airbnb.com/rooms/24714506', addedBy: V, token: vTokA, trip: 'nov26' });
const st0 = await J('GET', '/api/state?trip=nov26');
const lid = st0.listings.find(l => String(l.roomId) === '24714506')?.id;
ck('voter listing present', !!lid);
await J('POST', '/api/vote', { id: lid, token: vTokA, name: V, trip: 'nov26' });
const acts = await J('GET', '/api/activities');
const aid = acts.activities?.[0]?.id;
await J('POST', '/api/activity-vote', { id: aid, token: vTokA, name: V });
const vSend = await J('POST', '/api/auth/send-code', { name: V, token: vTokA, email: `voter+${tag}@example.com`, purpose: 'bind' });
const vVer = await J('POST', '/api/auth/verify', { name: V, code: vSend.devCode, purpose: 'bind' });
const vTokB = vVer.user.token;
ck('voter bind rotated token', !!vTokB && vTokB !== vTokA);
const reVote = await J('POST', '/api/vote', { id: lid, token: vTokB, name: V, trip: 'nov26' });
const mine = (reVote.votes || []).filter(v => v.name === V);
ck('re-vote after rotation stays one vote', mine.length === 1 && mine[0].token === vTokB, JSON.stringify(reVote.votes));
const reAct = await J('POST', '/api/activity-vote', { id: aid, token: vTokB, name: V });
ck('activity re-vote after rotation stays one vote', (reAct.votes || []).filter(v => v.name === V).length === 1, JSON.stringify(reAct.votes));
const un = await J('POST', '/api/vote', { id: lid, token: vTokB, trip: 'nov26' });
ck('unvote with rotated token clears the vote', (un.votes || []).filter(v => v.name === V).length === 0, JSON.stringify(un.votes));

console.log(`EMAIL: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
