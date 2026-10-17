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

// Imported verbatim from review/adversarial-tests (e7a89ac). ADV-BUG-8…11 (XSS, leave) live in
// test/adversarial.security.test.js on fix/firebase-security, where those fixes are.

// ───────────────────────── hand-derived: these should pass ─────────────────────────

test('ADV-OK-1 weekly primary across the 25 Oct 2026 clock change', () => {
  // Today Sat 17 Oct 2026. Weekly £600 on Fridays (next 23 Oct) → last payday Fri 16 Oct.
  // Periods: 16–22 Oct | 23–29 Oct (clocks go back Sun 25 Oct) | 30 Oct–5 Nov.
  // Phone £30 on the 20th, rent £1,500 on the 1st.
  // p0: 0 + 600 − 30 = 570 · p1: 570 + 600 = 1170 · p2: 1170 + 600 − 1500 = 270
  const app = loadApp({ now: '2026-10-17T10:00:00', state: {
    incomeSources: [{ name: 'Wage', amount: 600, schedule: 'weekly', nextdate: '2026-10-23' }],
    commitments: [
      { id: 'p', name: 'Phone', amount: 30, due_type: 'day_of_month', due_value: 20 },
      { id: 'r', name: 'Rent', amount: 1500, due_type: 'day_of_month', due_value: 1 }] } });
  assert.deepEqual(periods(app), [['This period', '2026-10-16', '2026-10-22'], ['Next period', '2026-10-23', '2026-10-29'], ['Period +2', '2026-10-30', '2026-11-05']]);
  const m = model(app);
  assert.deepEqual(m.map(r => [r.start, r.income, r.committed, r.left]), [[0, 600, 30, 570], [570, 600, 0, 1170], [1170, 600, 1500, 270]]);
  // safe buffer is monthly: 600×52/12 − 1530 = 1070
  assert.ok(Math.abs(app.run('trueBuffer()') - 1070) < 0.01);
});

test('ADV-OK-2 4-weekly primary period boundaries', () => {
  // 4-weekly next 30 Oct 2026 → previous 2 Oct. Periods 2–29 Oct | 30 Oct–26 Nov | 27 Nov–24 Dec
  const app = loadApp({ now: '2026-10-17T10:00:00', state: {
    incomeSources: [{ name: 'W', amount: 2000, schedule: '4weekly', nextdate: '2026-10-30' }] } });
  assert.deepEqual(periods(app).map(p => p.slice(1)), [['2026-10-02', '2026-10-29'], ['2026-10-30', '2026-11-26'], ['2026-11-27', '2026-12-24']]);
});

test('ADV-OK-3 fortnightly secondary lands 3× then 2× in monthly periods', () => {
  // Primary £2,500 monthly 24th. Fortnightly £400, next Fri 23 Oct → 25 Sep, 9 Oct, 23 Oct in 24 Sep–23 Oct
  // (income 2500 + 1200 = 3700); 6 Nov, 20 Nov in 24 Oct–23 Nov (2500 + 800 = 3300).
  const app = loadApp({ now: '2026-10-17T10:00:00', state: {
    incomeSources: [
      { name: 'Main', amount: 2500, schedule: 'monthly', nextdate: '2026-10-24' },
      { name: 'Fort', amount: 400, schedule: 'biweekly', nextdate: '2026-10-23' }] } });
  const m = model(app);
  assert.equal(m[0].income, 3700);
  assert.equal(m[1].income, 3300);
});

test('ADV-OK-4 negative starting balance chains through three periods', () => {
  // Today 17 Oct, −£250 recorded today. £2,000 monthly on the 24th. £100 on the 20th, £1,500 on the 25th.
  // p0 24 Sep–23 Oct: start −250 (balance 17 Oct), committed 100 (20 Oct) → −350
  // p1 24 Oct–23 Nov: −350 + 2000 − 1500 (25 Oct) − 100 (20 Nov) = 50
  // p2 24 Nov–23 Dec: 50 + 2000 − 1500 − 100 = 450. Chart lowest from today = −350 on 20 Oct.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: {
    incomeSources: [{ name: 'D', amount: 2000, schedule: 'monthly', nextdate: '2026-10-24' }],
    commitments: [
      { id: 'a', name: 'A', amount: 100, due_type: 'day_of_month', due_value: 20 },
      { id: 'b', name: 'B', amount: 1500, due_type: 'day_of_month', due_value: 25 }],
    currentBalance: -250, currentBalanceDate: '2026-10-17' } });
  assert.deepEqual(model(app).map(r => [r.start, r.income, r.committed, r.left]), [[-250, 0, 100, -350], [-350, 2000, 1600, 50], [50, 2000, 1600, 450]]);
  const cd = app.run('buildDailyBalances(periodHorizonDays(1))');
  assert.equal(cd.lowest, -350);
  assert.equal(cd.lowestDate, '20 Oct');
});

test('ADV-OK-5 payday on the 31st: Nov and Feb views', () => {
  // nextdate 31 Oct 2026. On 15 Nov: 31 Oct–29 Nov | 30 Nov–30 Dec | 31 Dec–30 Jan
  let app = loadApp({ now: '2026-11-15T10:00:00', state: { incomeSources: [{ name: 'X', amount: 1, schedule: 'monthly', nextdate: '2026-10-31' }] } });
  assert.deepEqual(periods(app).map(p => p.slice(1)), [['2026-10-31', '2026-11-29'], ['2026-11-30', '2026-12-30'], ['2026-12-31', '2027-01-30']]);
  // On 10 Feb 2027: 31 Jan–27 Feb | 28 Feb–30 Mar | 31 Mar–29 Apr
  app = loadApp({ now: '2027-02-10T10:00:00', state: { incomeSources: [{ name: 'X', amount: 1, schedule: 'monthly', nextdate: '2026-10-31' }] } });
  assert.deepEqual(periods(app).map(p => p.slice(1)), [['2027-01-31', '2027-02-27'], ['2027-02-28', '2027-03-30'], ['2027-03-31', '2027-04-29']]);
});

test('ADV-OK-6 payday on the 29th in a non-leap February', () => {
  // nextdate 29 Jan 2027, today 15 Feb 2027: 29 Jan–27 Feb | 28 Feb–28 Mar | 29 Mar–28 Apr
  const app = loadApp({ now: '2027-02-15T10:00:00', state: { incomeSources: [{ name: 'X', amount: 1, schedule: 'monthly', nextdate: '2027-01-29' }] } });
  assert.deepEqual(periods(app).map(p => p.slice(1)), [['2027-01-29', '2027-02-27'], ['2027-02-28', '2027-03-28'], ['2027-03-29', '2027-04-28']]);
});

test('ADV-OK-7 balance saved at 00:30 on the first GMT day is dated that day', () => {
  const app = loadApp({ now: '2026-10-26T00:30:00', state: { incomeSources: [{ name: 'D', amount: 1, schedule: 'monthly', nextdate: '2026-10-24' }] } });
  app.run("document.getElementById('inline-bal').value='-10.5'; saveInlineBalance();");
  assert.equal(app.run('S.currentBalanceDate'), '2026-10-26');
});

test('ADV-OK-8 skipped and deferred-with-instalments bills with an overdue instalment', () => {
  // Today 17 Oct, balance £1,000 today. Bill A £50 skipped. Bill B £300 deferred: £100 due 1 Oct (overdue, unpaid
  // → counts today), £200 due 10 Nov. p0 bills = 100, p1 bills = 200. p0 left = 900, p1 left = 900 + 0 − 200 = 700.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: {
    incomeSources: [{ name: 'D', amount: 0, schedule: 'monthly', nextdate: '2026-10-24' }],
    bills: [{ id: 'A', title: 'A', amount: '50', due_date: '2026-10-20', paid: false }, { id: 'B', title: 'B', amount: '300', due_date: '2026-10-20', paid: false }],
    decisions: { A: 'skip', B: 'defer' },
    instalments: { B: [{ id: 'i1', date: '2026-10-01', amount: '100', paid: false }, { id: 'i2', date: '2026-11-10', amount: '200', paid: false }] },
    currentBalance: 1000, currentBalanceDate: '2026-10-17' } });
  const m = model(app);
  assert.deepEqual(m.slice(0, 2).map(r => [r.bills, r.left]), [[100, 900], [200, 700]]);
});

// ───────────────────────── reviewer findings: these FAIL ─────────────────────────

test('ADV-BUG-1 horizon "Lowest" for This period skips today, hiding a same-day shortfall', () => {
  // Today 17 Oct, £100 recorded today, an overdue £150 bill (assumed due today) → −£50 today.
  // Partner's £1,000 lands 18 Oct, so This period ends at £950. The chart summary correctly says −£50 (17 Oct);
  // the horizon row starts its lowest-point search at balanceDate+1 and reports £950 → no "Lowest" line, no warning.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: {
    incomeSources: [{ name: 'Alex', amount: 3000, schedule: 'monthly', nextdate: '2026-10-24' },
                    { name: 'Sam', amount: 1000, schedule: 'monthly', nextdate: '2026-10-18' }],
    bills: [{ id: 'f', title: 'Fine', amount: '150', due_date: '2026-10-10', paid: false }],
    currentBalance: 100, currentBalanceDate: '2026-10-17' } });
  const cd = app.run('buildDailyBalances(periodHorizonDays(1))');
  assert.equal(cd.lowest, -50); // chart: right
  const [p0] = model(app);
  assert.equal(p0.left, 950);
  assert.equal(p0.lowest, -50, 'horizon row lowest should include today');
});

test('ADV-BUG-2 a paid bill with no paidDate (all existing data) is still taken off again on a future plan date', () => {
  // Same shape as the author's REAL-5 but WITHOUT paidDate — no build in this repo (or the live build) writes a non-empty paidDate,
  // so every bill paid before this branch looks like this. A bill marked paid cannot leave the account in the future.
  // 31 May £2,500 → 1 Jun −1,750 → 14 Jun +110 → 22 Jun should be £860 (no −£650 on 10 Jun).
  const app = loadApp({ now: '2026-05-31T11:00:00', state: {
    incomeSources: [{ name: 'Main wage', amount: 4500, schedule: 'monthly', nextdate: '2026-05-24' },
                    { name: 'Child benefit', amount: 110, schedule: 'monthly', nextdate: '2026-05-14' }],
    commitments: [{ id: 'f', name: 'Food', amount: 1750, due_type: 'day_of_month', due_value: 1 }],
    bills: [{ id: 'ct', title: 'Council tax', amount: '650.00', due_date: '2026-06-10', paid: true, paidDate: '' }],
    planDates: { ct: '2026-06-10' },
    currentBalance: 2500, currentBalanceDate: '2026-05-31' } });
  const cd = app.run('buildDailyBalances(periodHorizonDays(1))');
  assert.equal(cd.values[cd.labels.indexOf('22 Jun')], 2500 - 1750 + 110);
});

test('ADV-BUG-3 payday modal on payday suggests the payday AFTER next, and re-anchors a 31st payer to the 28th', () => {
  // Paid on the 31st. On payday 31 Dec 2026 (Pay mode now auto-opens), the end-of-pay-flow modal should
  // suggest 31 Jan 2027 as the next payday. It suggests 28 Feb (skips a month, clamps), and once saved the
  // anchor day becomes 28 so every later payday is projected on the 28th.
  const app = loadApp({ now: '2026-12-31T10:00:00', state: { incomeSources: [{ name: 'X', amount: 1000, schedule: 'monthly', nextdate: '2026-12-31' }] } });
  stubChart(app);
  app.run('askUpdatePayday([...S.incomeSources])');
  const suggested = app.run("document.getElementById('paydayModalDate').value");
  app.run('closePaydayModal(true)');
  const saved = app.run('S.incomeSources[0].nextdate');
  const later = loadApp({ now: '2027-03-01T10:00:00', state: { incomeSources: [{ name: 'X', amount: 1000, schedule: 'monthly', nextdate: saved }] } });
  assert.deepEqual([suggested, iso(later, 'nextPayday(S.incomeSources[0])')], ['2027-01-31', '2027-03-31']);
});

test('ADV-BUG-4 on payday the previous period\'s paid ticks show as paid again (legacy key = today)', () => {
  const state = { incomeSources: [{ name: 'D', amount: 3000, schedule: 'monthly', nextdate: '2026-06-24' }],
    commitments: [{ id: 'c', name: 'Mortgage', amount: 1000, due_type: 'day_of_month', due_value: 1 }] };
  const before = loadApp({ now: '2026-06-20T10:00:00', state });
  stubChart(before);
  before.run("toggleCommPaid('c')"); // ticked in the 24 May–23 Jun period
  const ticks = JSON.parse(JSON.stringify(before.run('S.paidCommitments')));
  const payday = loadApp({ now: '2026-06-24T10:00:00', state: { ...state, paidCommitments: ticks } });
  assert.equal(payday.run("isCommPaid('c')"), false, 'new period (24 Jun–23 Jul) must start unticked');
});

test('ADV-BUG-5 on any household member\'s payday the user cannot leave Pay mode (chart and horizon hidden all day)', () => {
  // Sam (secondary) is paid on the 28th. On 28 Jun the app forces Pay mode; tapping Plan is overridden.
  const app = loadApp({ now: '2026-06-28T10:00:00', state: {
    incomeSources: [{ name: 'Alex', amount: 4000, schedule: 'monthly', nextdate: '2026-06-24' },
                    { name: 'Sam', amount: 3000, schedule: 'monthly', nextdate: '2026-06-28' }] } });
  stubChart(app);
  app.run("setMode('plan')");
  assert.equal(app.run('currentMode'), 'plan');
});

test('ADV-BUG-6 an undated bill is placed on payday (first day of NEXT period), not "period end" as the UI says', () => {
  // getPlanDate's own comment and the bill card ("No date — placed at period end on chart") promise the end
  // of the current period. With payday 24 Jun the current period ends 23 Jun. The author's BUG-8 test pins 24 Jun.
  const app = loadApp({ now: '2026-06-10T09:00:00', state: {
    incomeSources: [{ name: 'D', amount: 4200, schedule: 'monthly', nextdate: '2026-06-24' }],
    bills: [{ id: 'b', title: 'Letter', amount: '20', paid: false }] } });
  const [p0] = model(app);
  assert.equal(p0.bills, 20, 'undated bill should count in This period');
});

test('ADV-BUG-7 a shortfall under £0.50 renders as "£-0 left"', () => {
  // £1,000 in, £1,000.40 out → −£0.40. BUG-14 claims "£-0" is fixed; it is only fixed for exactly −0.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: {
    incomeSources: [{ name: 'D', amount: 1000, schedule: 'monthly', nextdate: '2026-10-24' }],
    commitments: [{ id: 'a', name: 'A', amount: 1000.4, due_type: 'day_of_month', due_value: 1 }] } });
  const [p0] = model(app);
  assert.equal(p0.left, -0.4);
  app.run('renderHorizonSection()');
  assert.doesNotMatch(app.html('horizonSection'), /£-0 left/);
});

// ───────────────────────── limitations / design questions (todo) ─────────────────────────

// Promoted from todo: fixed (P-6) — a stale overdraft is carried in as Start and flagged.
test('ADV-TODO-1 a stale OVERDRAFT is replaced by £0 after 35 days (forecast jumps up by the overdraft)', () => {
  const mk = now => loadApp({ now, state: { incomeSources: [{ name: 'D', amount: 2000, schedule: 'monthly', nextdate: '2026-10-24' }],
    currentBalance: -2000, currentBalanceDate: '2026-09-10' } });
  const d34 = model(mk('2026-10-14T10:00:00'))[0].left, d36 = model(mk('2026-10-16T10:00:00'))[0].left;
  assert.ok(Math.abs(d34 - d36) < 1, `34 days: ${d34}, 36 days: ${d36}`);
});

test('ADV-TODO-2 weekend payday: 24 Oct 2026 is a Saturday; UK payroll pays Fri 23 Oct', { todo: 'no working-day shift in the model' }, () => {
  const app = loadApp({ now: '2026-10-23T12:00:00', state: { incomeSources: [{ name: 'D', amount: 1, schedule: 'monthly', nextdate: '2026-10-24' }] } });
  assert.equal(app.run('autoMode()'), 'pay');
});

test('ADV-TODO-3 unreceived one-off income dated on the balance day is treated as already received', { todo: 'inconsistent with unpaid bills (notInBalance); conservative' }, () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: { incomeSources: [{ name: 'D', amount: 0, schedule: 'monthly', nextdate: '2026-10-24' }],
    oneOffIncome: [{ id: 'o', title: 'Refund', amount: '500', date: '2026-10-17', received: false }],
    currentBalance: 100, currentBalanceDate: '2026-10-17' } });
  assert.equal(model(app)[0].left, 600);
});

test('ADV-TODO-4 an instalment paid after the balance was recorded is never subtracted', { todo: 'same class as BUG-9, for instalments (pre-existing)' }, () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: { incomeSources: [{ name: 'D', amount: 0, schedule: 'monthly', nextdate: '2026-10-24' }],
    bills: [{ id: 'B', title: 'B', amount: '200', due_date: '2026-10-15', paid: false }], decisions: { B: 'defer' },
    instalments: { B: [{ id: 'i', date: '2026-10-15', amount: '200', paid: true }] },
    currentBalance: 1000, currentBalanceDate: '2026-10-10' } });
  assert.equal(model(app)[0].left, 800);
});
