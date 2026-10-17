// Security-related app behaviour (household codes, leave, diagnostic, export).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('crypto');
const { loadApp, APP_JS } = require('./harness');

function app(state = {}) {
  const a = loadApp({ now: '2026-10-17T12:00:00', state });
  a.ctx.crypto = webcrypto;
  return a;
}

// Records every ref().set/update/once call instead of talking to Firebase.
function fakeDB(data = {}) {
  const calls = [];
  const ref = path => ({
    set: v => { calls.push(['set', path, v]); return Promise.resolve(); },
    update: v => { calls.push(['update', path, v]); return Promise.resolve(); },
    once: () => Promise.resolve({ val: () => data[path] ?? null }),
    on: () => () => {}, off() {},
  });
  return { calls, db: { ref } };
}

test('SEC-1 new household codes are 10 chars from the unambiguous alphabet, via crypto.getRandomValues', () => {
  const a = app();
  let used = 0;
  const real = webcrypto.getRandomValues.bind(webcrypto);
  a.ctx.crypto = { getRandomValues: arr => { used++; return real(arr); } };
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = a.run('generateCode()');
    assert.match(c, /^[A-HJ-NP-Z2-9]{10}$/);
    seen.add(c);
  }
  assert.equal(seen.size, 2000, 'no collisions expected in 2000 draws from 32^10');
  assert.equal(used, 2000);
  assert.doesNotMatch(APP_JS.match(/function generateCode[\s\S]*?\n}/)[0], /Math\.random/);
});

test('SEC-1b every alphabet character is reachable and roughly uniform (no modulo bias)', () => {
  const a = app();
  const counts = {};
  for (let i = 0; i < 4000; i++) for (const ch of a.run('generateCode()')) counts[ch] = (counts[ch] || 0) + 1;
  assert.equal(Object.keys(counts).length, 32);
  const exp = 40000 / 32;
  for (const n of Object.values(counts)) assert.ok(Math.abs(n - exp) < exp * 0.2, `count ${n} vs ${exp}`);
});

test('SEC-2 join accepts legacy 6-char and new 10-char codes, normalises case/spaces/dashes, rejects others', () => {
  const a = app();
  assert.equal(a.run("normaliseHouseholdCode(' pan-e47 ')"), 'PANE47');
  for (const ok of ['PANE47', 'K7QW2MXP4R']) assert.equal(a.run(`HOUSEHOLD_CODE_RE.test('${ok}')`), true, ok);
  for (const bad of ['PANE4', 'PANE471', 'PANE40', 'IIIIII', '../abc', 'K7QW2MXP4R5']) assert.equal(a.run(`HOUSEHOLD_CODE_RE.test('${bad}')`), false, bad);
});

test('SEC-2b joinHousehold with an invalid code never touches the database', () => {
  const a = app();
  const f = fakeDB();
  a.ctx.__db = f.db; a.run('firebaseDB = __db');
  a.elements['hh-code-input'] = { value: 'abc' };
  a.run('joinHousehold()');
  assert.equal(f.calls.length, 0);
});

test('SEC-3 the diagnostic no longer writes outside the household or advises opening the rules', () => {
  const fn = APP_JS.match(/async function runFirebaseDiagnostic[\s\S]*?\n}/)[0];
  assert.doesNotMatch(fn, /paymind_test/);
  assert.doesNotMatch(fn, /set \.read and \.write to true/);
});

test('SEC-3b runFirebaseDiagnostic only writes households/{code}/ping', async () => {
  const a = app({ firebaseUrl: 'https://x-default-rtdb.europe-west1.firebasedatabase.app', household: { household_code: 'K7QW2MXP4R', members: [] } });
  const f = fakeDB();
  a.ctx.__db = f.db; a.ctx.firebase = {}; a.run('firebaseDB = __db');
  a.elements.fbDiag = { textContent: '' };
  await a.run('runFirebaseDiagnostic()');
  assert.deepEqual(f.calls.map(c => c[0] + ' ' + c[1]), ['set households/K7QW2MXP4R/ping']);
});

test('SEC-4 leaving removes only this device from the shared member list', () => {
  const members = [
    { device_id: 'dev_a', name: 'Alex' }, { device_id: 'dev_me', name: 'Me' }, { device_id: 'dev_b', name: 'Sam' },
  ];
  const a = app({ deviceId: 'dev_me', household: { household_code: 'PANE47', members } });
  const f = fakeDB();
  a.ctx.__db = f.db; a.run('firebaseDB = __db; firebaseListener = function(){}');
  a.run('leaveHousehold()');
  const set = f.calls.find(c => c[0] === 'set');
  assert.equal(set[1], 'households/PANE47/household/members');
  assert.deepEqual(JSON.parse(JSON.stringify(set[2])).map(m => m.device_id), ['dev_a', 'dev_b']);
  assert.equal(a.run('S.household'), null);
});

test('SEC-5 backups never contain the AI API key', () => {
  const a = app({ apiKey: 'sk-test-not-a-real-key', bills: [] });
  const out = JSON.parse(JSON.stringify(a.run('exportForBackup(S)')));
  assert.equal('apiKey' in out, false);
  assert.equal(a.run('S.apiKey'), 'sk-test-not-a-real-key', 'local state unchanged');
});
