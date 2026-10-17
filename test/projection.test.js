'use strict';
// Reproduction + regression tests for the projection / graph maths.
// Run: npm test   (TZ is pinned to Europe/London — the app's users are UK-based)
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, householdState, renderHorizon } = require('./helpers');

const NOW = '2026-06-10T09:00:00'; // BST (UTC+1)

// ─── Period labels ─────────────────────────────────────────────
test('BUG-1 period labels are This / Next / Period +2', () => {
  const app = loadApp({ now: NOW, state: householdState() });
  const labels = app.run('buildPeriods(3).map(p=>p.label)');
  assert.deepEqual([...labels], ['This period', 'Next period', 'Period +2']);
});

// ─── "left this period" ────────────────────────────────────────
test('BUG-2 with no balance set, "This period" left = income − committed for the pay cycle (£1,200)', () => {
  const app = loadApp({ now: NOW, state: householdState() });
  const [p0] = renderHorizon(app);
  assert.equal(p0.income, 7000, p0.text);
  assert.equal(p0.committed, 5800, p0.text);
  assert.equal(p0.left, 1200, p0.text);
});

test('BUG-2 every horizon row reconciles: start + income − committed − bills = left', () => {
  const app = loadApp({ now: NOW, state: householdState({ currentBalance: 2500, currentBalanceDate: '2026-06-10' }) });
  const rows = renderHorizon(app);
  assert.equal(rows.length, 3);
  for (const r of rows) {
    assert.notEqual(r.start, null, 'row must show its opening balance: ' + r.text);
    assert.ok(Math.abs(r.start + r.income - r.committed - r.bills - r.left) <= 1, 'does not reconcile: ' + r.text);
  }
});

test('BUG-2 £0 income period explains a large "left" via its opening balance', () => {
  // Balance recorded the day after payday, next payday 14 days away, nothing lands before it.
  const app = loadApp({ now: NOW, state: {
    incomeSources: [{ name: 'Alex', amount: 4000, schedule: 'monthly', nextdate: '2026-06-24' }],
    commitments: [{ id: 'c1', name: 'Gym', amount: 40, due_type: 'day_of_month', due_value: 20 }],
    currentBalance: 6040, currentBalanceDate: '2026-06-10' } });
  const [p0] = renderHorizon(app);
  assert.equal(p0.income, 0);
  assert.equal(p0.start, 6040, p0.text);
  assert.equal(p0.committed, 40, 'only commitments landing in the period: ' + p0.text);
  assert.equal(p0.left, 6000);
});

test('BUG-2 horizon covers all three periods even on the 1-period chart setting', () => {
  const app = loadApp({ now: NOW, state: householdState({ currentBalance: 2500, currentBalanceDate: '2026-06-10' }) });
  const rows = renderHorizon(app);
  // Period +2 must chain from Next period's closing balance, not restart from 0
  assert.equal(rows[2].start, rows[1].left, rows[2].text);
  assert.equal(rows[1].start, rows[0].left, rows[1].text);
});

// ─── Bills figure ──────────────────────────────────────────────
test('BUG-3 overdue unpaid bill still counts in This period Bills and in the chart', () => {
  const app = loadApp({ now: NOW, state: householdState({
    currentBalance: 2500, currentBalanceDate: '2026-06-10',
    bills: [{ id: 'b1', title: 'Parking fine', amount: '70.00', due_date: '2026-06-05', paid: false }] }) });
  const [p0] = renderHorizon(app);
  assert.equal(p0.bills, 70, p0.text);
  const cd = app.run('buildDailyBalances(35)');
  const i = cd.labels.indexOf('11 Jun');
  assert.equal(cd.values[i], 2500 - 70, 'overdue bill should be assumed due now');
});

test('BUG-3 skipped bill is excluded from Bills; deferred instalments count by instalment date', () => {
  const app = loadApp({ now: NOW, state: householdState({
    bills: [
      { id: 'b1', title: 'Skip me', amount: '50', due_date: '2026-06-15', paid: false },
      { id: 'b2', title: 'Deferred', amount: '300', due_date: '2026-06-15', paid: false },
    ],
    decisions: { b1: 'skip', b2: 'defer' },
    instalments: { b2: [{ id: 'i1', date: '2026-06-15', amount: '100', paid: false }, { id: 'i2', date: '2026-07-15', amount: '200', paid: false }] } }) });
  const [p0, p1] = renderHorizon(app);
  assert.equal(p0.bills, 100, p0.text);
  assert.equal(p1.bills, 200, p1.text);
});

// ─── Lowest point ──────────────────────────────────────────────
test('BUG-4 summary lowest point is inside the current period (today … day before payday)', () => {
  const app = loadApp({ now: NOW, state: {
    incomeSources: [{ name: 'Alex', amount: 4000, schedule: 'monthly', nextdate: '2026-06-24' }],
    commitments: [
      { id: 'c1', name: 'Rent', amount: 5000, due_type: 'day_of_month', due_value: 25 }, // 25 May: synthetic dip before today
      { id: 'c2', name: 'Phone', amount: 30, due_type: 'day_of_month', due_value: 18 },
    ],
    currentBalance: 1000, currentBalanceDate: '2026-06-10' } });
  // the chart on its "1 period" setting (old code: fixed 35 days, i.e. into next period)
  const cd = app.run("buildDailyBalances(typeof periodHorizonDays==='function'?periodHorizonDays(1):35)");
  assert.equal(cd.lowestDate, '18 Jun');
  assert.equal(cd.lowest, 970);
  // and on any horizon the lowest point is never a reconstructed day before today
  const cd2 = app.run('buildDailyBalances(65)');
  assert.ok(cd2.labels.indexOf(cd2.lowestDate) >= cd2.todayIdx, cd2.lowestDate);
});

// ─── Starting balance / overdraft ──────────────────────────────
test('BUG-5 an overdrawn balance can be entered and anchors the projection', () => {
  const app = loadApp({ now: NOW, state: householdState() });
  app.run("document.getElementById('inline-bal').value='-180.40'; saveInlineBalance();");
  assert.equal(app.run('S.currentBalance'), -180.4);
  const cd = app.run('buildDailyBalances(35)');
  assert.equal(cd.values[cd.labels.indexOf('10 Jun')], -180.4);
  assert.equal(cd.startBal, -180.4);
});

test('BUG-5 CSV "Starting balance" that is negative sets an overdraft, not +income', () => {
  const app = loadApp({ now: NOW, state: householdState() });
  app.run(`_lastCSVRows=parseCSV('category,description,amount,day_of_month\\nother,Starting balance,-180.40,1');
           importCSVData('x','onboarding');`);
  assert.equal(app.run('S.currentBalance'), -180.4);
  assert.equal(app.run('S.oneOffIncome.length'), 0);
});

// ─── Pay-cycle boundaries ──────────────────────────────────────
test('BUG-6 monthly payday on the 31st does not drift into the next month', () => {
  const app = loadApp({ now: NOW, state: { incomeSources: [{ name: 'X', amount: 1000, schedule: 'monthly', nextdate: '2026-01-31' }] } });
  const d = app.run('__iso(nextPayday(S.incomeSources[0]))');
  assert.equal(d, '2026-06-30');
  const feb = app.run("__iso(nextPayday(S.incomeSources[0], new Date(2026,0,31)))");
  assert.equal(feb, '2026-02-28');
});

test('BUG-6 walking back from a 31st payday lands on the last payday (31 May)', () => {
  const app = loadApp({ now: NOW, state: { incomeSources: [{ name: 'X', amount: 1000, schedule: 'monthly', nextdate: '2026-07-31' }] } });
  const ps = app.run('__iso(buildDailyBalances(35).periodStart)');
  assert.equal(ps, '2026-05-31');
});

test('BUG-6 payday on the 24th: period boundaries are 24th → 23rd', () => {
  const app = loadApp({ now: NOW, state: householdState() });
  const ps = app.run('buildPeriods(3).map(p=>[__iso(p.start),__iso(p.end)])');
  assert.deepEqual(JSON.parse(JSON.stringify(ps)), [
    ['2026-05-24', '2026-06-23'], ['2026-06-24', '2026-07-23'], ['2026-07-24', '2026-08-23']]);
});

test('BUG-7 commitments due on the 29th–31st land on that day (or the month end), not the 28th', () => {
  const app = loadApp({ now: NOW, state: {
    incomeSources: [{ name: 'Alex', amount: 4000, schedule: 'monthly', nextdate: '2026-06-24' }],
    commitments: [{ id: 'c1', name: 'Council tax', amount: 300, due_type: 'day_of_month', due_value: 31 }] } });
  const dates = app.run("buildChartEvents(95,new Date(2026,4,24)).events.map(e=>__iso(e.date))");
  assert.deepEqual([...dates], ['2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31']);
});

test('BUG-11 "days after payday" commitments anchor to the primary (largest) income source', () => {
  const app = loadApp({ now: NOW, state: householdState({
    commitments: [{ id: 'c1', name: 'Savings', amount: 200, due_type: 'days_after_payday', due_value: 2 }] }) });
  const dates = app.run("buildChartEvents(35,new Date(2026,4,24)).events.map(e=>__iso(e.date))");
  assert.deepEqual([...dates], ['2026-05-26', '2026-06-26']);
});

// ─── Timezone / date parsing ───────────────────────────────────
test('BUG-8 / P-5 undated bill defaults to the last day of This period, in local time (no BST off-by-one)', () => {
  // primary payday 24 Jun → This period ends 23 Jun (the bill card says "placed at period end")
  const app = loadApp({ now: NOW, state: householdState({ bills: [{ id: 'b1', title: 'Letter', amount: '20', paid: false }] }) });
  assert.equal(app.run('getPlanDate(S.bills[0])'), '2026-06-23');
});

test('BUG-8 CSV income day-of-month is stored as that local date', () => {
  const app = loadApp({ now: NOW, state: {} });
  assert.equal(app.run('nextMonthOccurrence(24)'), '2026-06-24');
  assert.equal(app.run('nextMonthOccurrence(31)'), '2026-06-30');
});

test('BUG-8 a balance saved at 00:30 BST is recorded against today, not yesterday', () => {
  const app = loadApp({ now: '2026-06-11T00:30:00', state: householdState() });
  app.run("document.getElementById('inline-bal').value='100'; saveInlineBalance();");
  assert.equal(app.run('S.currentBalanceDate'), '2026-06-11');
});

test('BUG-8 paid-commitment flags survive the BST→GMT change (stable period key)', () => {
  const app = loadApp({ now: NOW, state: householdState() });
  assert.equal(app.run('commPeriodKey()'), '2026-06-24');
  // legacy key written by the old code in BST (UTC date = day before) is still honoured
  app.run("S.paidCommitments={[new Date(2026,5,24).toISOString().slice(0,10)]:{c_mort:true}}");
  assert.equal(app.run("isCommPaid('c_mort')"), true);
});

// ─── Double counting ───────────────────────────────────────────
test('BUG-9 a bill paid early is not subtracted again after the balance is updated', () => {
  const app = loadApp({ now: NOW, state: householdState({
    bills: [{ id: 'b1', title: 'Vet', amount: '135', due_date: '2026-06-20', paid: false }] }) });
  app.run("markPaidDirect('b1'); document.getElementById('inline-bal').value='1000'; saveInlineBalance();");
  const cd = app.run('buildDailyBalances(35)');
  // only the £3,700 commitment on the 15th lands between now and the 21st
  assert.equal(cd.values[cd.labels.indexOf('21 Jun')], 1000 - 3700);
});

// ─── Frequencies ───────────────────────────────────────────────
test('BUG-10 safe buffer normalises weekly / fortnightly income to a month before subtracting monthly commitments', () => {
  const app = loadApp({ now: NOW, state: {
    incomeSources: [{ name: 'Wages', amount: 500, schedule: 'weekly', nextdate: '2026-06-12' }],
    commitments: [{ id: 'c1', name: 'Rent', amount: 1500, due_type: 'day_of_month', due_value: 1 }] } });
  assert.ok(Math.abs(app.run('trueBuffer()') - (500 * 52 / 12 - 1500)) < 0.01, String(app.run('trueBuffer()')));
});

test('weekly / fortnightly income expands to the right number of paydays per period', () => {
  const app = loadApp({ now: NOW, state: {
    incomeSources: [
      { name: 'Main', amount: 2000, schedule: 'monthly', nextdate: '2026-06-24' },
      { name: 'Side', amount: 100, schedule: 'weekly', nextdate: '2026-06-12' },
      { name: 'Fort', amount: 300, schedule: 'biweekly', nextdate: '2026-06-19' },
    ] } });
  const n = app.run(`(()=>{const p=buildPeriods(1)[0];const c=n=>paydaysBetween(S.incomeSources.find(x=>x.name===n),p.start,p.end).length;return c('Side')+','+c('Fort');})()`);
  // 24 May–23 Jun: Fridays 29 May, 5, 12, 19 Jun = 4 weekly; fortnightly 5 Jun, 19 Jun = 2
  assert.equal(n, '4,2');
});

// ─── Payday-day behaviour ──────────────────────────────────────
test('BUG-12 on payday itself the app knows it is payday (Pay mode / "Payday today")', () => {
  const app = loadApp({ now: '2026-06-24T08:00:00', state: householdState() });
  assert.equal(app.run('daysUntil(nearestPayday().date)'), 0);
  assert.equal(app.run('autoMode()'), 'pay');
});

test('BUG-12 paid-commitment period key does not change on the partner\'s payday', () => {
  const k1 = loadApp({ now: '2026-06-25T09:00:00', state: householdState() }).run('commPeriodKey()');
  const k2 = loadApp({ now: '2026-06-29T09:00:00', state: householdState() }).run('commPeriodKey()');
  assert.equal(k1, k2);
});

// ─── Stale balance ─────────────────────────────────────────────
test('BUG-5 a balance recorded before the current period still anchors the projection', () => {
  const app = loadApp({ now: NOW, state: {
    incomeSources: [{ name: 'Alex', amount: 4000, schedule: 'monthly', nextdate: '2026-06-24' }],
    commitments: [{ id: 'c1', name: 'Rent', amount: 1500, due_type: 'day_of_month', due_value: 1 }],
    currentBalance: -180.4, currentBalanceDate: '2026-05-20' } });
  const cd = app.run('buildDailyBalances(35)');
  // −180.40 on 20 May, +4,000 on 24 May → 3,819.60; −1,500 on 1 Jun → 2,319.60
  assert.equal(cd.values[cd.labels.indexOf('24 May')], 3819.6);
  assert.equal(cd.values[cd.labels.indexOf('10 Jun')], 2319.6);
});

// ─── Money handling ────────────────────────────────────────────
test('money sums are rounded to pence (no 0.1 + 0.2 drift)', () => {
  const app = loadApp({ now: NOW, state: {
    incomeSources: [{ name: 'Alex', amount: 0.3, schedule: 'monthly', nextdate: '2026-06-24' }],
    commitments: [
      { id: 'a', name: 'A', amount: 0.1, due_type: 'day_of_month', due_value: 11 },
      { id: 'b', name: 'B', amount: 0.2, due_type: 'day_of_month', due_value: 12 }],
    currentBalance: 0, currentBalanceDate: '2026-06-10' } });
  const cd = app.run('buildDailyBalances(35)');
  assert.equal(cd.values[cd.labels.indexOf('12 Jun')], -0.3);
  assert.equal(cd.values[cd.labels.indexOf('24 Jun')], 0);
});

// ─── Smoke: the whole dashboard renders ────────────────────────
test('renderDashboard renders chart summary + horizon without errors', () => {
  const app = loadApp({ now: NOW, state: householdState({ currentBalance: -180.4, currentBalanceDate: '2026-06-10',
    bills: [{ id: 'b1', title: 'Vet', amount: '135', due_date: '2026-06-20', paid: false }], decisions: { b1: 'pay' } }) });
  app.run('Chart=function(){this.destroy=function(){}}; renderDashboard();');
  assert.match(app.html('balSummary'), /−£180/);
  assert.match(app.html('horizonSection'), /Period \+2/);
  assert.doesNotMatch(app.html('balDashSection') + app.html('horizonSection'), /error/i);
});

test('"Going out" is the outflow still to come in the charted range, not a fixed monthly total', () => {
  const app = loadApp({ now: NOW, state: householdState({ currentBalance: 2500, currentBalanceDate: '2026-06-10' }) });
  const cd = app.run('buildDailyBalances(periodHorizonDays(1))');
  assert.equal(cd.totalOut, 3700); // only "Everything else" on the 15th is left before payday
});

test('BUG-8 period end is the day before payday across the March clock change (no lost day)', () => {
  const app = loadApp({ now: '2027-03-10T09:00:00', state: { incomeSources: [{ name: 'D', amount: 1000, schedule: 'monthly', nextdate: '2027-03-29' }] } });
  const p = app.run('buildPeriods(1)[0]');
  assert.equal(app.run('__iso(buildPeriods(1)[0].end)'), '2027-03-28');
  assert.equal(p.end.getHours(), 0);
});

// ─── Found by replaying a real export (fully synthetic stand-in data below) ───
function realShape(extra = {}) {
  return Object.assign({
    incomeSources: [
      { name: 'Main wage', amount: 4500, schedule: 'monthly', nextdate: '2026-05-24' }, // never advanced since May
      { name: 'Second wage', amount: 2100, schedule: '4weekly', nextdate: '2026-06-26' },
      { name: 'Child benefit', amount: 110, schedule: 'monthly', nextdate: '2026-05-14' },
      { name: 'Maintenance', amount: 200, schedule: 'monthly', nextdate: '2026-05-27' },
    ],
    commitments: [
      { id: 'r', name: 'Rent', amount: 4000, due_type: 'day_of_month', due_value: 25 },
      { id: 'f', name: 'Food', amount: 1750, due_type: 'day_of_month', due_value: 1 },
    ],
    currentBalance: 2500, currentBalanceDate: '2026-05-31',
  }, extra);
}

test('REAL-1 a stale nextdate does not freeze the period start in May (Oct view is 24 Sep–23 Oct)', () => {
  const app = loadApp({ now: '2026-10-17T15:00:00', state: realShape() });
  const cd = app.run('buildDailyBalances(periodHorizonDays(1))');
  assert.equal(cd.labels[0], '24 Sept');
  assert.ok(['17 Oct','18 Oct','19 Oct','20 Oct','21 Oct','22 Oct','23 Oct'].includes(cd.lowestDate), cd.lowestDate);
});

test('REAL-1 a months-old balance is not rolled forward (an old May balance used to be rolled forward to October)', () => {
  const app = loadApp({ now: '2026-10-17T15:00:00', state: realShape() });
  const [p0] = renderHorizon(app);
  assert.equal(p0.start, 0, p0.text);
  // 24 Sep–23 Oct: main 24 Sep, maintenance 27 Sep, child 14 Oct, second 16 Oct (4-weekly from 26 Jun)
  assert.equal(p0.income, 6910, p0.text);
  assert.equal(p0.committed, 5750, p0.text);
  assert.equal(p0.left, 1160, p0.text);
  assert.match(p0.text, /too old to project from/);
  assert.equal(app.run('buildDailyBalances(35).staleBalanceDate') !== null, true);
});

test('REAL-1 a balance recorded within the last 35 days still anchors', () => {
  const app = loadApp({ now: '2026-06-20T10:00:00', state: realShape() });
  const cd = app.run('buildDailyBalances(periodHorizonDays(1))');
  assert.equal(cd.hasBalance, true);
});

test('REAL-2 "Going out" counts only what is still to come (not every month since the balance)', () => {
  const app = loadApp({ now: '2026-06-20T10:00:00', state: realShape() });
  const cd = app.run('buildDailyBalances(periodHorizonDays(1))'); // 20–23 Jun: nothing due
  assert.equal(cd.totalOut, 0);
});

test('REAL-3 day-of-month ordinals read 1st / 2nd / 3rd / 11th / 22nd (not "1th", "22th")', () => {
  const app = loadApp({ now: NOW, state: {} });
  assert.deepEqual([...app.run('[1,2,3,4,11,12,13,21,22,23,31].map(ordinal)')],
    ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st']);
});

test('REAL-4 commitments header includes unplanned bills like the pie list does', () => {
  const app = loadApp({ now: NOW, state: realShape({ currentBalanceDate: '2026-06-10',
    bills: [{ id: 'd', title: 'Toll charge', amount: '95.40', due_date: '2026-06-11', paid: false }] }) });
  app.run('renderCommitmentsSection()');
  assert.match(app.html('commitmentsSection'), /£5750\/month \+ £95 unplanned/);
});

test('REAL-5 a bill paid in May with a June plan date is not taken again in June', () => {
  const app = loadApp({ now: '2026-05-31T11:00:00', state: realShape({
    bills: [{ id: 'ct', title: 'Council tax', amount: '650.00', due_date: '2026-06-10', paid: true, paidDate: '2026-05-07' }],
    planDates: { ct: '2026-06-10' } }) });
  const cd = app.run('buildDailyBalances(periodHorizonDays(1))');
  // 31 May £2,500 → 1 Jun −£1,750 → 14 Jun +£110 (child benefit); no −£650 on 10 Jun
  assert.equal(cd.values[cd.labels.indexOf('22 Jun')], 2500 - 1750 + 110);
});

test('REAL-6 a 4-weekly wage can land twice in one monthly period and is flagged', () => {
  const app = loadApp({ now: '2026-07-25T10:00:00', state: realShape({ currentBalance: null }) });
  const rows = renderHorizon(app);
  const two = rows.find(r => /Includes 1 extra Second wage/.test(r.text));
  assert.ok(two, rows.map(r => r.text).join('\n'));
  assert.equal(two.income, 4500 + 2 * 2100 + 110 + 200);
});
