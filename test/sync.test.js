// Household sync behaviour after the review (S-1, S-3, S-4, S-5b).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('crypto');
const { loadApp } = require('./helpers');

// In-memory stand-in for the Realtime Database: update/set/transaction against a JS object, plus a listener.
function memoryDB(initial = {}) {
  const root = JSON.parse(JSON.stringify(initial));
  const writes = [];
  let listener = null;
  const get = p => p.split('/').reduce((o, k) => (o == null ? undefined : o[k]), root);
  const put = (p, v) => {
    const ks = p.split('/'), last = ks.pop();
    const o = ks.reduce((o, k) => (o[k] ??= {}), root);
    if (v === null || v === undefined || (Array.isArray(v) && !v.length)) delete o[last]; else o[last] = JSON.parse(JSON.stringify(v));
  };
  const ref = p => ({
    once: () => Promise.resolve({ val: () => JSON.parse(JSON.stringify(get(p) ?? null)) }),
    update: v => { writes.push(['update', p, JSON.parse(JSON.stringify(v))]); Object.entries(v).forEach(([k, x]) => put(p + '/' + k, x)); return Promise.resolve(); },
    set: v => { writes.push(['set', p, v]); put(p, v); return Promise.resolve(); },
    transaction: fn => { const r = fn(JSON.parse(JSON.stringify(get(p) ?? null))); writes.push(['transaction', p, r]); put(p, r); return Promise.resolve({ committed: true }); },
    on: (ev, cb) => { listener = cb; return cb; }, off(ev, cb) { if (cb === listener) listener = null; },
  });
  return { db: { ref }, root, writes, get, fire: p => listener && listener({ val: () => JSON.parse(JSON.stringify(get(p) ?? null)) }) };
}
const flush = () => new Promise(r => setImmediate(r));
function app(state) {
  const a = loadApp({ now: '2026-10-17T12:00:00', state });
  a.ctx.crypto = webcrypto;
  a.run('Chart=function(){this.destroy=function(){}};');
  return a;
}
const HH = (members) => ({ household_code: 'PANE47', members: members.map(d => ({ device_id: d, name: d })) });

test('S-1 empty collections sync as false (never null), absent scalars are not sent, long text is capped', () => {
  const a = app({ deviceId: 'dev_a', household: HH(['dev_a']), bills: [], commitments: [], goals: 'g'.repeat(25000), currentBalance: null });
  const m = memoryDB();
  a.ctx.__db = m.db; a.run('firebaseDB=__db; syncToFirebase()');
  const [, , payload] = m.writes.at(-1);
  assert.equal(payload.bills, false);
  assert.equal(payload.commitments, false);
  assert.equal(payload.decisions, false);
  assert.equal('currentBalance' in payload, false);
  assert.equal(Object.values(payload).includes(null), false);
  assert.equal(payload.goals.length, 20000);
});

test('S-1 a `false` collection from the server is read back as empty', () => {
  const a = app({ deviceId: 'dev_b', household: HH(['dev_a', 'dev_b']), bills: [{ id: 'x', title: 'X', amount: '1' }] });
  const m = memoryDB({ households: { PANE47: { household: HH(['dev_a', 'dev_b']), bills: false, lastDevice: 'dev_a' } } });
  a.ctx.__db = m.db; a.run('firebaseDB=__db; attachFirebaseListener()');
  m.fire('households/PANE47');
  assert.deepEqual(JSON.parse(JSON.stringify(a.run('S.bills'))), []);
});

test('S-3 leave removes only this device from the SERVER list (transaction) and bumps lastDevice', async () => {
  // server already has dev_c, who joined after our local copy was taken
  const a = app({ deviceId: 'dev_a', household: HH(['dev_a', 'dev_b']) });
  const m = memoryDB({ households: { PANE47: { household: HH(['dev_a', 'dev_b', 'dev_c']), lastDevice: 'dev_b' } } });
  a.ctx.__db = m.db; a.run('firebaseDB=__db; firebaseListener=function(){}');
  a.run('leaveHousehold()');
  await flush();
  assert.deepEqual(m.get('households/PANE47/household/members').map(x => x.device_id), ['dev_b', 'dev_c']);
  assert.equal(m.get('households/PANE47/lastDevice'), 'dev_a');
  assert.equal(a.run('S.household'), null);
});

test('S-3 end to end: after A leaves, B\'s next routine sync does not write A back', async () => {
  const m = memoryDB({ households: { PANE47: { household: HH(['dev_a', 'dev_b']), lastDevice: 'dev_b', bills: false } } });
  const A = app({ deviceId: 'dev_a', household: HH(['dev_a', 'dev_b']) });
  const B = app({ deviceId: 'dev_b', household: HH(['dev_a', 'dev_b']) });
  B.ctx.__db = m.db; B.run('firebaseDB=__db; attachFirebaseListener()');
  A.ctx.__db = m.db; A.run('firebaseDB=__db; firebaseListener=function(){}; leaveHousehold()');
  await flush();
  m.fire('households/PANE47');
  B.run('syncToFirebase()');
  assert.deepEqual(m.get('households/PANE47/household/members').map(x => x.device_id), ['dev_b']);
});

test('S-3 joining copies every synced field, so the first sync cannot wipe the household\'s history', async () => {
  const remote = { household: HH(['dev_a']), bills: [{ id: 'b', title: 'B', amount: '5' }], history: [{ date: '2026-09-24', income: 100, committed: 50 }],
    oneOffIncome: [{ id: 'o', title: 'O', amount: '9', date: '2026-10-30' }], paidCommitments: { '2026-10-24': { c: true } }, lastDevice: 'dev_a' };
  const m = memoryDB({ households: { PANE47: remote } });
  const a = app({ deviceId: 'dev_new', history: [], oneOffIncome: [] });
  a.ctx.__db = m.db; a.run('firebaseDB=__db');
  a.elements['hh-code-input'] = { value: 'pane47' };
  a.run('joinHousehold()');
  await flush();
  const h = m.get('households/PANE47');
  assert.equal(h.history.length, 1);
  assert.equal(h.oneOffIncome.length, 1);
  assert.deepEqual(h.paidCommitments, { '2026-10-24': { c: true } });
  assert.deepEqual(h.household.members.map(x => x.device_id), ['dev_a', 'dev_new']);
});

test('S-4 "move to a new code": data moves to a fresh 10-char code; the old node is scrubbed and marked retired', async () => {
  const m = memoryDB({ households: { PANE47: { household: HH(['dev_a', 'dev_b']), bills: [{ id: 'b', title: 'Secret', amount: '5' }], narrative: 'private', currentBalance: 123, lastDevice: 'dev_b' } } });
  const a = app({ deviceId: 'dev_a', household: HH(['dev_a', 'dev_b']), bills: [{ id: 'b', title: 'Secret', amount: '5' }], narrative: 'private', currentBalance: 123, currentBalanceDate: '2026-10-17' });
  a.ctx.__db = m.db; a.run('firebaseDB=__db; firebaseListener=function(){}');
  await a.run('retireHouseholdCode()');
  const code = a.run('S.household.household_code');
  assert.match(code, /^[A-HJ-NP-Z2-9]{10}$/);
  assert.equal(m.get(`households/${code}/bills`)[0].title, 'Secret');
  const old = m.get('households/PANE47');
  assert.equal(old.household.retired, true);
  assert.equal(old.household.members, undefined);
  assert.equal(old.bills, false);
  assert.equal(old.narrative, '');
  assert.equal(old.currentBalance, '');
});

test('S-4 a device listening on a retired code stops syncing and keeps its local data', () => {
  const m = memoryDB({ households: { PANE47: { household: { household_code: 'PANE47', retired: true }, bills: false, lastDevice: 'dev_a' } } });
  const b = app({ deviceId: 'dev_b', household: HH(['dev_a', 'dev_b']), bills: [{ id: 'b', title: 'Mine', amount: '5' }] });
  b.ctx.__db = m.db; b.run('firebaseDB=__db; attachFirebaseListener()');
  m.fire('households/PANE47');
  assert.equal(b.run('S.household'), null);
  assert.equal(b.run('S.bills.length'), 1);
  const before = m.writes.length;
  b.run('save()');
  assert.equal(m.writes.length, before, 'no further writes to the retired code');
});

test('S-5b goals input is limited to 5,000 characters, with a message instead of a silent sync failure', () => {
  const a = app({});
  a.elements['set-goals'] = { value: 'x'.repeat(6000) };
  let toast = '';
  a.ctx.__t = m => { toast = m; };
  a.run('showToast=__t; saveGoals()');
  assert.equal(a.run('S.goals.length'), 5000);
  assert.match(toast, /trimmed/);
});

test('rollout check: every sync stamps clientVersion and this device\'s member entry; other members keep theirs', () => {
  const a = app({ deviceId: 'dev_a', household: { household_code: 'PANE47', members: [{ device_id: 'dev_a', name: 'A' }, { device_id: 'dev_b', name: 'B', client: 'old-x' }, { device_id: 'dev_c', name: 'C' }] } });
  const m = memoryDB();
  a.ctx.__db = m.db; a.run('firebaseDB=__db; syncToFirebase()');
  const [, , payload] = m.writes.at(-1);
  const build = a.run('APP_BUILD');
  assert.equal(payload.clientVersion, build);
  assert.deepEqual(payload.household.members.map(x => x.client), [build, 'old-x', undefined]);
  // normalising synced data keeps (and bounds) the member build stamp
  const n = JSON.parse(JSON.stringify(a.run(`normaliseSyncedData({household:{household_code:'PANE47',members:[{device_id:'d',name:'n',client:'${'v'.repeat(60)}'}]}})`)));
  assert.equal(n.household.members[0].client.length, 40);
  // the household screen flags members still on an old build
  a.run('renderHouseholdSection()');
  const html = Object.values(a.elements).map(e => String(e.innerHTML || '')).join('\n');
  assert.match(html, /hh-member/);
  assert.match(html, /⚠ old build/);
  assert.match(html, /build old-x/);
});
