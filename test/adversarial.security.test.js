'use strict';
// Reviewer's adversarial tests (independent of the author's suite).
// Expected numbers below are derived BY HAND in the comments, not read back from the implementation.
//   "ADV-OK-*"  : hand-derived checks that the branch gets right (should pass)
//   "ADV-BUG-*" : reviewer findings; these FAIL on fix/projection-maths + fix/firebase-security
//   todo tests  : documented model limitations / design questions (reported, not failing)
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, renderHorizon } = require('./helpers');

const iso = (app, expr) => app.run(`__iso(${expr})`);
const periods = (app, n = 3) => JSON.parse(JSON.stringify(app.run(`buildPeriods(${n}).map(p=>[p.label,__iso(p.start),__iso(p.end)])`)));
const model = (app, n = 3) => JSON.parse(JSON.stringify(app.run(`buildHorizonModel(${n}).map(r=>({start:r.startBal,income:r.income,committed:r.committed,bills:r.bills,left:r.left,lowest:r.lowest,lowestDt:r.lowestDt}))`)));
const stubChart = app => app.run('Chart=function(){this.destroy=function(){}};');

// Imported verbatim from review/adversarial-tests (e7a89ac): the security findings ADV-BUG-8…11.
// The projection findings (ADV-OK-*, ADV-BUG-1…7, ADV-TODO-*) are in test/adversarial.test.js on fix/projection-maths.

// ───────────────────────── reviewer findings (security) ─────────────────────────

test('ADV-BUG-8 synced bill text is injected unescaped into Pay mode (auto-opens on payday)', () => {
  // Anyone holding the household code can write bills (accepted beta risk). Pay mode renders title/sender/
  // summary/consequence/recommendation raw, and bill.id inside an onclick="...('${id}')" handler.
  const x = '<img src=x onerror=alert(1)>';
  const app = loadApp({ now: '2026-06-24T10:00:00', state: {
    incomeSources: [{ name: 'D', amount: 4200, schedule: 'monthly', nextdate: '2026-06-24' }],
    bills: [{ id: "b1');alert(1);//", title: x, sender: x, summary: x, consequence: x, recommendation: x, amount: '10', urgency: 'urgent', paid: false }],
    decisions: {} } });
  app.run("currentMode='pay'; renderActionSection()");
  const html = app.html('actionSection');
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /\('b1'\);alert\(1\);/);
});

test('ADV-BUG-9 synced bill title is injected unescaped into the Next action card', () => {
  const app = loadApp({ now: '2026-06-10T10:00:00', state: {
    incomeSources: [{ name: 'D', amount: 4200, schedule: 'monthly', nextdate: '2026-06-24' }],
    bills: [{ id: 'b1', title: '<img src=x onerror=alert(1)>', amount: '10', urgency: 'urgent', paid: false }] } });
  app.run("currentMode='plan'; renderNextActionCard()");
  assert.doesNotMatch(app.html('nextActionCard'), /<img src=x/);
});

test('ADV-BUG-10 synced income-source name is injected unescaped into the payday modal', () => {
  const app = loadApp({ now: '2026-06-24T10:00:00', state: {
    incomeSources: [{ name: '<img src=x onerror=alert(1)>', amount: 4200, schedule: 'monthly', nextdate: '2026-06-24' }] } });
  app.run('askUpdatePayday([...S.incomeSources])');
  assert.doesNotMatch(app.html('paydayModalBody'), /<img src=x/);
});

test('ADV-BUG-11 "leave" is undone by the partner\'s next sync (listener ignores the leave write)', () => {
  // Device B synced last, so households/X/lastDevice === 'dev_b'. A leaves: only household/members is written
  // (lastDevice unchanged). B's listener drops the update as "own write", keeps A in its local list, and B's next
  // routine syncToFirebase() writes A back.
  let onValue = null; const writes = [];
  const app = loadApp({ now: '2026-10-17T12:00:00', state: { deviceId: 'dev_b',
    household: { household_code: 'PANE47', members: [{ device_id: 'dev_a', name: 'A' }, { device_id: 'dev_b', name: 'B' }] } } });
  stubChart(app);
  app.ctx.__db = { ref: p => ({ on: (ev, cb) => { onValue = cb; return cb; }, off() {}, update: v => { writes.push([p, v]); return Promise.resolve(); }, set: v => { writes.push([p, v]); return Promise.resolve(); }, once: () => Promise.resolve({ val: () => null }) }) };
  app.run('firebaseDB=__db; attachFirebaseListener()');
  // remote state after A left:
  const remote = { household: { household_code: 'PANE47', members: [{ device_id: 'dev_b', name: 'B' }] }, lastDevice: 'dev_b', bills: [] };
  onValue({ val: () => remote });
  app.run('syncToFirebase()');
  const members = JSON.parse(JSON.stringify(writes.at(-1)[1].household.members)).map(m => m.device_id);
  assert.deepEqual(members, ['dev_b']);
});

