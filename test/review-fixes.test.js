// Author's tests for the review findings on fix/projection-maths (P-1 … P-8, P-11).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, renderHorizon } = require('./helpers');

const model = (app, n = 3) => JSON.parse(JSON.stringify(app.run(`buildHorizonModel(${n}).map(r=>({start:r.startBal,income:r.income,committed:r.committed,bills:r.bills,left:r.left,lowest:r.lowest}))`)));
const stubChart = app => app.run('Chart=function(){this.destroy=function(){}};');
const one = { incomeSources: [{ name: 'D', amount: 2000, schedule: 'monthly', nextdate: '2026-10-24' }] };

// ─── P-1 paid bills ───────────────────────────────────────────
test('P-1 paid, no paidDate, no balance: not deducted anywhere (assumed already in the balance)', () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: { ...one,
    bills: [{ id: 'x', title: 'X', amount: '300', due_date: '2026-10-20', paid: true }] } });
  assert.equal(model(app)[0].bills, 0);
});

test('P-1 paid AFTER the balance was recorded: deducted once, on paidDate', () => {
  // balance £1,000 on 10 Oct; bill paid 12 Oct → This period 24 Sep–23 Oct: 1000 − 300 = 700
  const app = loadApp({ now: '2026-10-17T10:00:00', state: { ...one,
    bills: [{ id: 'x', title: 'X', amount: '300', due_date: '2026-11-05', paid: true, paidDate: '2026-10-12' }],
    currentBalance: 1000, currentBalanceDate: '2026-10-10' } });
  const [p0, p1] = model(app);
  assert.deepEqual([p0.bills, p0.left], [300, 700]);
  assert.equal(p1.bills, 0, 'not taken again on its due/plan date');
});

test('P-1 paid BEFORE (or on) the balance date: already in the balance, not deducted', () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: { ...one,
    bills: [{ id: 'x', title: 'X', amount: '300', due_date: '2026-11-05', paid: true, paidDate: '2026-10-10' }],
    currentBalance: 1000, currentBalanceDate: '2026-10-10' } });
  assert.deepEqual(model(app).map(r => r.bills), [0, 0, 0]);
  assert.equal(model(app)[0].left, 1000);
});

test('P-1 a paidDate in the future is clamped to today (a paid bill cannot leave later)', () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: { ...one,
    bills: [{ id: 'x', title: 'X', amount: '300', paid: true, paidDate: '2026-11-02' }],
    currentBalance: 1000, currentBalanceDate: '2026-10-15' } });
  const [p0, p1] = model(app);
  assert.deepEqual([p0.bills, p0.left, p1.bills], [300, 700, 0]);
});

test('P-1 marking paid records today as paidDate; unmarking clears it', () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: { ...one, bills: [{ id: 'x', title: 'X', amount: '5', paid: false }] } });
  stubChart(app);
  app.run("markPaidDirect('x')");
  assert.equal(app.run('S.bills[0].paidDate'), '2026-10-17');
  app.run("unmarkPaid('x')");
  assert.equal(app.run('S.bills[0].paidDate'), undefined);
});

// ─── P-2 Pay mode ─────────────────────────────────────────────
test('P-2 Pay mode auto-opens once on the PRIMARY payday, then the user\'s choice sticks', () => {
  const app = loadApp({ now: '2026-10-24T09:00:00', state: { incomeSources: [
    { name: 'Alex', amount: 4000, schedule: 'monthly', nextdate: '2026-10-24' },
    { name: 'Sam', amount: 3000, schedule: 'monthly', nextdate: '2026-10-28' }] } });
  stubChart(app);
  app.run('renderDashboard()');
  assert.equal(app.run('currentMode'), 'pay', 'opens on payday');
  app.run("setMode('plan')");
  app.run('renderDashboard(); renderDashboard()');
  assert.equal(app.run('currentMode'), 'plan', 'stays in Plan after re-renders');
  assert.notEqual(app.html('horizonSection'), '', 'horizon visible on payday in Plan mode');
});

test('P-2 a partner\'s payday does not open or lock Pay mode', () => {
  const app = loadApp({ now: '2026-10-28T09:00:00', state: { incomeSources: [
    { name: 'Alex', amount: 4000, schedule: 'monthly', nextdate: '2026-10-24' },
    { name: 'Sam', amount: 3000, schedule: 'monthly', nextdate: '2026-10-28' }] } });
  stubChart(app);
  app.run('renderDashboard()');
  assert.equal(app.run('currentMode'), 'plan');
});

// ─── P-3 payday anchor ────────────────────────────────────────
test('P-3 31st payer: modal on 31 Jan suggests 28 Feb, and the next one is still 31 Mar', () => {
  const app = loadApp({ now: '2027-01-31T10:00:00', state: { incomeSources: [{ name: 'X', amount: 1000, schedule: 'monthly', nextdate: '2027-01-31' }] } });
  stubChart(app);
  app.run('askUpdatePayday([...S.incomeSources])');
  assert.equal(app.run("document.getElementById('paydayModalDate').value"), '2027-02-28');
  assert.match(app.html('paydayModalBody'), /last payday was 31 Jan/);
  app.run('closePaydayModal(true)');
  const src = JSON.parse(JSON.stringify(app.run('S.incomeSources[0]')));
  assert.deepEqual([src.nextdate, src.payDay], ['2027-02-28', 31]);
  const later = loadApp({ now: '2027-03-01T10:00:00', state: { incomeSources: [src] } });
  assert.equal(later.run('__iso(nextPayday(S.incomeSources[0]))'), '2027-03-31');
});

test('P-3 editing the next payday to a different day re-anchors; a month-end date in a short month keeps the 31st', () => {
  const app = loadApp({ now: '2027-02-10T10:00:00', state: { incomeSources: [{ name: 'X', amount: 1, schedule: 'monthly', nextdate: '2027-01-31', payDay: 31 }] } });
  stubChart(app);
  app.run("openEditIncomeSource(0); document.getElementById('ei-next').value='2027-02-28'; document.getElementById('ei-name').value='X'; document.getElementById('ei-amount').value='1'; document.getElementById('ei-sch').value='monthly'; saveEditIncomeSource(0)");
  assert.equal(app.run('S.incomeSources[0].payDay'), 31);
  app.run("openEditIncomeSource(0); document.getElementById('ei-next').value='2027-03-15'; saveEditIncomeSource(0)");
  assert.equal(app.run('S.incomeSources[0].payDay'), undefined);
  assert.equal(app.run('__iso(nextPayday(S.incomeSources[0], new Date(2027,2,20)))'), '2027-04-15');
});

// ─── P-6 stale overdraft ──────────────────────────────────────
test('P-6 a stale overdraft is carried in as Start (flagged); a stale positive balance still starts at £0', () => {
  let app = loadApp({ now: '2026-10-17T10:00:00', state: { ...one, currentBalance: -800, currentBalanceDate: '2026-08-01' } });
  let rows = renderHorizon(app);
  assert.deepEqual([rows[0].start, rows[0].income, rows[0].left], [-800, 2000, 1200]);
  assert.match(rows[0].text, /Estimate: overdraft from 1 Aug carried in as Start/);
  app = loadApp({ now: '2026-10-17T10:00:00', state: { ...one, currentBalance: 800, currentBalanceDate: '2026-08-01' } });
  rows = renderHorizon(app);
  assert.equal(rows[0].start, 0);
  assert.match(rows[0].text, /too old to project from/);
});

// ─── P-8 formatting ───────────────────────────────────────────
test('P-8 horizon rows use one money format (−£350), and a sub-£1 shortfall shows pence', () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: { ...one, currentBalance: -250, currentBalanceDate: '2026-10-17',
    commitments: [{ id: 'a', name: 'A', amount: 100, due_type: 'day_of_month', due_value: 20 }] } });
  app.run('renderHorizonSection()');
  const html = app.html('horizonSection');
  assert.match(html, /−£350 left/);
  assert.match(html, /Start −£250/);
  assert.doesNotMatch(html, /£-/);
  assert.equal(app.run('fmtLeft(-0.4)'), '−£0.40');
  assert.equal(app.run('fmtGBP(-0.4)'), '£0');
});

// ─── P-11 dead code ───────────────────────────────────────────
test('P-11 unused billsInPeriod / incomeInPeriod removed; markPaidDirect defined once', () => {
  const { APP_JS } = require('./harness');
  assert.doesNotMatch(APP_JS, /function (billsInPeriod|incomeInPeriod)\b/);
  assert.equal((APP_JS.match(/function markPaidDirect\b/g) || []).length, 1);
});
