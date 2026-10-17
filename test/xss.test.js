// S-2: synced data must never become markup or script. Every string in the state is set to an
// HTML/attribute/JS breaker, every view is rendered, and the produced HTML is checked.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers');

const X = `"'><img src=x onerror=alert(1)>`;           // breaks out of text, "…" and '…' attributes
const XID = `b1');alert(1);//"><img src=x>`;            // breaks out of an inline-JS string argument
const today = '2026-06-24';

function hostileState(dates) {
  const d = v => (dates ? X : v);
  return {
    firebaseUrl: 'https://x-default-rtdb.europe-west1.firebasedatabase.app',
    deviceName: X,
    household: { household_code: X, members: [{ device_id: X, name: X, joined_at: X }] },
    incomeSources: [
      { name: X, amount: X, schedule: X, nextdate: d(today) },
      { name: X + '2', amount: '100', schedule: 'monthly', nextdate: d('2026-06-28') }],
    commitments: [{ id: XID, name: X, amount: X, category: X, due_type: X, due_value: X, source: X, actual_last: X, notes: X }],
    bills: [
      { id: XID, title: X, sender: X, summary: X, consequence: X, recommendation: X, urgency: X, urgency_reason: X,
        sensitivity: X, category: X, type: X, amount: X, due_date: d('2026-06-20'), priority_rank: X, paid: false },
      { id: XID + 'p', title: X, sender: X, amount: '10', due_date: d('2026-06-01'), paid: true, paidDate: X, urgency: 'urgent' },
      { id: XID + 'u', title: X, amount: '10', urgency: 'urgent', paid: false }],
    decisions: { [XID]: 'defer', [XID + 'u']: X },
    planDates: { [XID]: d('2026-06-21') },
    instalments: { [XID]: [{ id: XID, date: d('2026-06-22'), amount: X, paid: false }] },
    oneOffIncome: [{ id: XID, title: X, amount: X, date: d('2026-06-26'), received: false, notes: X },
                   { id: XID + 'r', title: X, amount: '5', date: d('2026-06-02'), received: true, notes: X }],
    narrative: X, narrativeDate: X, goals: X,
    observationCards: [{ id: XID, title: X, body: X, text: X, type: X, category: X, observation: X, action: X, saving: X, dismissed: false }],
    history: [{ date: X, income: X, committed: X, billsPaid: [{ title: X, amount: X, paidDate: X }], commitmentsPaid: [{ name: X, amount: X }], balance: X, balanceDate: X }],
    currentBalance: X, currentBalanceDate: d(today), dismissedAlerts: [],
  };
}

function renderEverything(app) {
  const errors = [];
  // data reaches S through load() / the Firebase listener / join / import, all of which normalise it
  app.run('S = Object.assign({}, DEF, normaliseSyncedData(S));');
  const tryRun = code => { try { app.run(code); } catch (e) { errors.push(code + ': ' + e.message); } };
  app.run('Chart=function(){this.destroy=function(){}};');
  for (const mode of ['plan', 'pay', 'awareness']) {
    tryRun(`currentMode='${mode}'; S.showPaid=true;`);
    for (const f of ['renderAlerts', 'renderCalmOverview', 'renderNudges', 'renderBalanceCard', 'renderNextActionCard',
      'renderPaydayCountdown', 'renderTiles', 'renderBalDash', 'renderBalPlanBar', 'renderNarrative', 'renderBillsSection',
      'renderCommitmentsSection', 'renderRecurringIncomeSection', 'renderOneOffIncomeSection', 'renderHorizonSection',
      'renderActionSection', 'renderObservationCards', 'renderHistory', 'renderHouseholdSection', 'renderSetSources',
      'renderSetCommitments', 'populateSettings'])
      tryRun(`if(typeof ${f}==='function') ${f}()`);
  }
  tryRun(`currentMode='plan'; openEditBill(S.bills[0].id)`);
  tryRun(`openEditCommitment(S.commitments[0].id)`);
  tryRun(`openEditIncomeSource(0)`);
  tryRun(`openEditOneOffIncome(S.oneOffIncome[0].id)`);
  tryRun(`askUpdatePayday([...S.incomeSources])`);
  tryRun(`addSource('ob-sources', S.incomeSources[0])`);
  tryRun(`document.getElementById('x').innerHTML=commitmentInnerHTML('comm_1', S.commitments[0])`);
  return errors;
}

function injected(app) {
  const bad = [];
  for (const [id, el] of Object.entries(app.elements)) {
    const h = String(el.innerHTML || '');
    if (/<img\b/i.test(h)) bad.push(`${id}: <img> tag`);
    // entity-escaping does NOT protect inline JS (the browser decodes &#x27; before running it), so no data in on*="…"
    if (/\bon\w+="[^"]*alert\(1\)/.test(h)) bad.push(`${id}: synced data inside an inline handler`);
    if (/="[^"]*"\s*onerror=/i.test(h)) bad.push(`${id}: attribute breakout`);
    if (/\bon(click|change|input)="[^"]*\$\{/.test(h)) bad.push(`${id}: unexpanded template in handler`);
  }
  return bad;
}

for (const [label, dates] of [['valid dates', false], ['hostile dates too', true]]) {
  test(`S-2 no markup or script from synced data in any view (${label})`, () => {
    const app = loadApp({ now: '2026-06-24T10:00:00', state: hostileState(dates) });
    app.ctx.firebaseDB = null;
    const errors = renderEverything(app);
    const bad = injected(app);
    assert.deepEqual(bad, [], 'injection found:\n' + bad.join('\n') + (errors.length ? '\n(render errors: ' + errors.join(' | ') + ')' : ''));
  });
}

test('S-2 views that matter actually rendered the hostile bill (the scan is not vacuous)', () => {
  const app = loadApp({ now: '2026-06-24T10:00:00', state: hostileState(false) });
  renderEverything(app);
  app.run("currentMode='pay'; renderActionSection()");
  const all = Object.values(app.elements).map(e => String(e.innerHTML || '')).join('\n');
  assert.match(all, /&lt;img src=x onerror=alert\(1\)&gt;/);
  for (const id of ['billsSection', 'actionSection', 'editModalBody', 'paydayModalBody', 'commitmentsSection', 'recurringIncomeSection'])
    assert.notEqual(String(app.elements[id]?.innerHTML || ''), '', id + ' rendered');
});

test('S-2 id-bearing buttons use data attributes, and the dispatcher passes the exact id', () => {
  const app = loadApp({ now: '2026-06-24T10:00:00', state: hostileState(false) });
  renderEverything(app);
  app.run('currentMode="plan"; renderBillsSection()');
  const h = app.html('billsSection');
  assert.match(h, /data-act="openEditBill"/);
  const calls = [];
  app.ctx.__calls = calls;
  app.run('openEditBill=function(id){__calls.push(id)}');
  // decode the first data-id the way the browser's dataset would
  const m = h.match(/data-act="openEditBill" data-id="([^"]*)"/);
  const unesc = s => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  app.ctx.__ds = { act: 'openEditBill', id: unesc(m[1]) };
  app.run('runUIAction(__ds)');
  assert.equal(calls.length, 1);
  assert.equal(calls[0], unesc(m[1]));
  assert.ok(JSON.parse(JSON.stringify(app.run('S.bills.map(b=>b.id)'))).includes(calls[0]), 'a real bill id');
  assert.equal(app.run("runUIAction({act:'eval'}); runUIAction({act:'constructor'}); 'ok'"), 'ok', 'unknown actions are ignored');
});

test('S-2 synced enums, ids and dates are normalised on the way in', () => {
  const app = loadApp({ now: '2026-06-24T10:00:00', state: {} });
  app.ctx.__in = hostileState(true);
  const out = JSON.parse(JSON.stringify(app.run('normaliseSyncedData(__in)')));
  const b = out.bills[0];
  assert.match(b.id, /^[A-Za-z0-9_.:-]+$/);
  assert.equal(b.urgency, 'medium');
  assert.equal(b.category, 'other');
  assert.equal(b.due_date, '');
  assert.equal(b.priority_rank, null);
  assert.equal(out.decisions[b.id], 'defer', 'keys are mapped with the same id rule');
  assert.equal(Object.values(out.decisions).includes(X), false, 'invalid decision dropped');
  assert.equal(out.planDates[b.id], undefined, 'invalid plan date dropped');
  assert.equal(out.incomeSources[0].schedule, 'monthly');
  assert.equal(b.title, X, 'free text is kept (escaped at output, not mangled)');
});
