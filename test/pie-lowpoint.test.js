'use strict';
// v1.8.2: commitments pie "remaining" slice + per-period "Lowest: £X on Ddd D Mon".
// Synthetic data only. Expected figures are derived by hand in the comments.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, renderHorizon } = require('./helpers');

const plain = (app, expr) => JSON.parse(JSON.stringify(app.run(expr)));
const pie = app => plain(app, 'commitmentsPieModel()');
const sliceVal = (pm, cat) => (pm.slices.find(s => s.cat === cat) || {}).value;
const renderComm = app => { app.run('S.commCollapsed=true;renderCommitmentsSection();'); return app.html('commitmentsSection'); };

// Today Sat 17 Oct 2026. Monthly £2,000 on the 24th → This period 24 Sep–23 Oct.
// Rent £900 (housing) on the 20th, phone £40 (communication) on the 22nd, broadband £30 (utilities) on the 1st.
const base = (extra = {}) => Object.assign({
  incomeSources: [{ name: 'Wage', amount: 2000, schedule: 'monthly', nextdate: '2026-10-24' }],
  commitments: [
    { id: 'c1', name: 'Rent', amount: 900, category: 'housing', due_type: 'day_of_month', due_value: 20 },
    { id: 'c2', name: 'Phone', amount: 40, category: 'communication', due_type: 'day_of_month', due_value: 22 },
    { id: 'c3', name: 'Broadband', amount: 30, category: 'utilities', due_type: 'day_of_month', due_value: 1 }],
}, extra);

test('PIE-1 remaining slice equals the horizon "£X left" for This period (no balance: pie totals income)', () => {
  // No balance → start £0. This period 24 Sep–23 Oct: income 2000 (24 Sep), rent 900 (20 Oct), phone 40 (22 Oct),
  // broadband 30 (1 Oct), bill £100 due 21 Oct → left = 2000 − 970 − 100 = 930.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: base({
    bills: [{ id: 'b1', title: 'Vet', amount: '100', due_date: '2026-10-21', paid: false }] }) });
  const [p0] = renderHorizon(app);
  assert.equal(p0.left, 930);
  const pm = pie(app);
  assert.equal(pm.remaining, 930);
  assert.equal(sliceVal(pm, 'remaining'), p0.left, 'remaining slice must be the rendered "£X left"');
  assert.equal(pm.over, null);
  assert.equal(sliceVal(pm, 'housing'), 900);
  assert.equal(sliceVal(pm, 'communication'), 40);
  assert.equal(sliceVal(pm, 'utilities'), 30);
  assert.equal(sliceVal(pm, 'unplanned'), 100);
  const total = pm.slices.reduce((s, x) => s + x.value, 0);
  assert.equal(total, 2000, 'with nothing carried in, the pie totals the period income');
  const html = renderComm(app);
  assert.match(html, /remaining/);
  assert.match(html, /£930/);
  assert.doesNotMatch(html, /Over by/);
});

test('PIE-2 with a balance recorded mid-period, remaining still equals "£X left" and slices total start + income', () => {
  // Balance £1,200 on 17 Oct. Still to come in This period: rent 900 (20th), phone 40 (22nd). left = 1200 − 940 = 260.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: base({ currentBalance: 1200, currentBalanceDate: '2026-10-17' }) });
  const [p0] = renderHorizon(app);
  assert.equal(p0.left, 260);
  const pm = pie(app);
  assert.equal(pm.remaining, p0.left);
  assert.equal(pm.slices.reduce((s, x) => s + x.value, 0), pm.startBal + pm.income);
  assert.match(renderComm(app), /Start £1,200 \+ Income £0/);
});

test('PIE-3 negative remaining: no remaining slice, red "Over by £X" label', () => {
  // Balance £500 on 17 Oct, rent 900 + phone 40 still to come → left = 500 − 940 = −440.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: base({ currentBalance: 500, currentBalanceDate: '2026-10-17' }) });
  const [p0] = renderHorizon(app);
  assert.equal(p0.left, -440);
  const pm = pie(app);
  assert.equal(pm.remaining, 0);
  assert.equal(pm.over, 440);
  assert.equal(sliceVal(pm, 'remaining'), undefined, 'no remaining slice when over');
  const html = renderComm(app);
  assert.match(html, /class="pie-over"[^>]*>Over by £440</);
  assert.doesNotMatch(html, /💷/);
  // the label's CSS class is red
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(src, /\.pie-over\{color:var\(--danger\)/);
});

test('PIE-4 exactly zero left: no slice, no "Over by £0"', () => {
  // Balance £940 on 17 Oct, 940 still to come → left 0.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: base({ currentBalance: 940, currentBalanceDate: '2026-10-17' }) });
  const pm = pie(app);
  assert.equal(pm.left, 0);
  assert.equal(sliceVal(pm, 'remaining'), undefined);
  const html = renderComm(app);
  assert.doesNotMatch(html, /Over by £0/);
  assert.match(html, /Nothing left/);
});

test('PIE-5 category text in the pie is escaped', () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: base({
    commitments: [{ id: 'x', name: 'X', amount: 50, category: '<img src=x onerror=alert(1)>', due_type: 'day_of_month', due_value: 20 }] }) });
  const html = renderComm(app);
  assert.doesNotMatch(html, /<img/);
});

// ─── Low point ───────────────────────────────────────────────────────────────

function walkMin(app, i) {
  // Independent recomputation from the chart walk: min of buildDailyBalances values between
  // max(today, period start, balance date) and period end.
  return plain(app, `(()=>{const ps=buildPeriods(3),p=ps[${i}],t=parseLocalDate(new Date());
    const cd=buildDailyBalances(Math.round((ps[ps.length-1].end-t)/86400000));
    let from=p.start<t?t:p.start; if(cd.balanceDate&&cd.balanceDate>from) from=cd.balanceDate;
    let m=null,d=null; cd.dates.forEach((x,k)=>{if(x>=from&&x<=p.end&&(m===null||cd.values[k]<m)){m=cd.values[k];d=__iso(x);}});
    return {min:m,date:d,start:__iso(p.start),end:__iso(p.end)};})()`);
}

test('LOW-1 each period\'s low point is the minimum of the chart walk and lies inside that period', () => {
  // Balance £1,200 on 17 Oct. p0: 17 Oct 1200 → 20 Oct 300 → 22 Oct 260 (low 260 on Thu 22 Oct).
  // p1 24 Oct–23 Nov: 24 Oct +2000 → 2260; 1 Nov −30 → 2230; 20 Nov −900 → 1330; 22 Nov −40 → 1290 (low 1290 on Sun 22 Nov).
  const app = loadApp({ now: '2026-10-17T10:00:00', state: base({ currentBalance: 1200, currentBalanceDate: '2026-10-17' }) });
  const rows = plain(app, 'buildHorizonModel(3).map(r=>({lowest:r.lowest,d:r.lowestDate?__iso(r.lowestDate):null,start:__iso(r.start),end:__iso(r.end)}))');
  rows.forEach((r, i) => {
    const w = walkMin(app, i);
    assert.equal(r.lowest, w.min, `period ${i} lowest`);
    assert.equal(r.d, w.date, `period ${i} date`);
    assert.ok(r.d >= r.start && r.d <= r.end, `period ${i} low date ${r.d} outside ${r.start}..${r.end}`);
  });
  assert.equal(rows[0].lowest, 260); assert.equal(rows[0].d, '2026-10-22');
  assert.equal(rows[1].lowest, 1290); assert.equal(rows[1].d, '2026-11-22');
  const html = (app.run('renderHorizonSection()'), app.html('horizonSection'));
  assert.match(html, /Lowest: £260 on Thu 22 Oct/);
  assert.match(html, /Lowest: £1,290 on Sun 22 Nov/);
  assert.equal((html.match(/Lowest: /g) || []).length, 3, 'shown on every period row incl. Period +2');
});

test('LOW-2 colour: red when negative, amber below the chart\'s Tight line (10% of income), plain otherwise', () => {
  // left −440 → low −440 on 22 Oct (red). Tight line = 10% × 2000 = 200.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: base({ currentBalance: 500, currentBalanceDate: '2026-10-17' }) });
  app.run('renderHorizonSection()');
  let html = app.html('horizonSection');
  assert.match(html, /class="hz-low neg">Lowest: −£440 on Thu 22 Oct</);
  // £1,090 on 17 Oct → low 150 on 22 Oct (< 200 → amber)
  const app2 = loadApp({ now: '2026-10-17T10:00:00', state: base({ currentBalance: 1090, currentBalanceDate: '2026-10-17' }) });
  app2.run('renderHorizonSection()');
  assert.match(app2.html('horizonSection'), /class="hz-low tight">Lowest: £150 on Thu 22 Oct</);
  // £1,200 → low 260 (≥ 200 → plain)
  const app3 = loadApp({ now: '2026-10-17T10:00:00', state: base({ currentBalance: 1200, currentBalanceDate: '2026-10-17' }) });
  app3.run('renderHorizonSection()');
  assert.match(app3.html('horizonSection'), /class="hz-low">Lowest: £260 on Thu 22 Oct</);
});

test('LOW-3 no balance set: low point shows "—"', () => {
  const app = loadApp({ now: '2026-10-17T10:00:00', state: base() });
  app.run('renderHorizonSection()');
  const html = app.html('horizonSection');
  assert.equal((html.match(/Lowest: —/g) || []).length, 3);
  assert.doesNotMatch(html, /Lowest: £/);
});

test('LOW-4 an overdue bill moved to today makes today the low point (inside This period)', () => {
  // £100 on 17 Oct, overdue £150 → −£50 today (Sat 17 Oct); £1,000 lands 18 Oct.
  const app = loadApp({ now: '2026-10-17T10:00:00', state: {
    incomeSources: [{ name: 'A', amount: 3000, schedule: 'monthly', nextdate: '2026-10-24' },
                    { name: 'B', amount: 1000, schedule: 'monthly', nextdate: '2026-10-18' }],
    bills: [{ id: 'f', title: 'Fine', amount: '150', due_date: '2026-10-10', paid: false }],
    currentBalance: 100, currentBalanceDate: '2026-10-17' } });
  app.run('renderHorizonSection()');
  assert.match(app.html('horizonSection'), /class="hz-low neg">Lowest: −£50 on Sat 17 Oct</);
});
