// User deletion is PM-only (worker/users/users.js: the endpoint checks
// the caller's token against the PM account's). Covers the authorization
// matrix end to end against the local test instance.
//
// Standalone use: TEST_BASE=http://localhost:8791 node tests/robustness/users.mjs
const B = process.env.TEST_BASE || 'http://localhost:8791';
const J = async (m, p, o) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: o === undefined ? undefined : JSON.stringify(o) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* ignore */ }
  return j;
};
let pass = 0, fail = 0;
const ck = (name, cond, extra) => { if (cond) { pass++; console.log('OK  ', name); } else { fail++; console.log('FAIL', name, extra ?? ''); } };
const tag = Date.now().toString(36);
const VICTIM = 'Victim' + tag;

// PM may pre-exist in a seeded list; either way login returns its token.
const pm = await J('POST', '/api/login', { name: 'PM', token: 'pm-device-' + tag });
const pmTok = pm.user?.token;
ck('PM login returns a token', !!pmTok, JSON.stringify(pm));

const vic = await J('POST', '/api/login', { name: VICTIM, token: 'victim-device-' + tag });
const vicTok = vic.user?.token;
ck('victim created', !!vicTok, JSON.stringify(vic));

const noTok = await J('POST', '/api/users/delete', { name: VICTIM });
ck('delete without a token rejected', noTok.ok === false, JSON.stringify(noTok));
const wrongTok = await J('POST', '/api/users/delete', { name: VICTIM, token: 'not-a-real-token' });
ck('delete with a bogus token rejected', wrongTok.ok === false, JSON.stringify(wrongTok));
const byVictim = await J('POST', '/api/users/delete', { name: VICTIM, token: vicTok });
ck('delete by a non-PM user rejected', byVictim.ok === false && /只有 PM/.test(byVictim.error || ''), JSON.stringify(byVictim));

const mid = await J('GET', '/api/users');
ck('victim still listed after rejected deletes', mid.users.some(u => u.name === VICTIM));

const ghost = await J('POST', '/api/users/delete', { name: 'Nobody' + tag, token: pmTok });
ck('deleting a nonexistent user rejected', ghost.ok === false, JSON.stringify(ghost));
const self = await J('POST', '/api/users/delete', { name: 'PM', token: pmTok });
ck('PM cannot delete itself', self.ok === false && /不能删 PM/.test(self.error || ''), JSON.stringify(self));

const del = await J('POST', '/api/users/delete', { name: VICTIM, token: pmTok });
ck('PM deletes the victim', del.ok === true, JSON.stringify(del));
const after = await J('GET', '/api/users');
ck('victim gone from the list', !after.users.some(u => u.name === VICTIM));
ck('PM still listed', after.users.some(u => u.name.toLowerCase() === 'pm'));

console.log(`USERS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
