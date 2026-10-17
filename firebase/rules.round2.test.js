// Reviewer round 2 (independent). Local emulator ONLY (same guard as rules.test.js).
//   RR-OK-*  : re-verification (pass)
//   RR-BUG-* : open findings (FAIL against database.rules.json @ 93caf17)
//
// Author's note (PR 2): RR-BUG-1/1b/2 are real and are NOT fixable in the rules without re-allowing deletes.
// They are handled by the rollout order instead (docs/firebase-security.md, step 0: every device and the live
// site on the new build BEFORE these rules are published). They are kept here inverted, as pinned expectations,
// so the step-0 warning cannot silently go stale. RR-BUG-3 (single-item delete) is accepted and documented.
'use strict';
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { ref, get, set, update } = require('firebase/database');
const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000';
if (!/^(127\.0\.0\.1|localhost):/.test(host)) throw new Error('refusing to run outside the local emulator');
const [hostname, port] = host.split(':');

const CODE = 'PANE47';
const hh = { household_code: CODE, members: [{ device_id: 'dev_a', name: 'A' }] };
const remote = () => ({ bills: [{ id: 'b1', title: 'Car tax', amount: 10 }], commitments: [{ id: 'c', name: 'Rent', amount: 900 }],
  decisions: { b1: 'pay' }, instalments: false, incomeSources: [{ name: 'D', amount: 2000, schedule: 'monthly', nextdate: '2026-10-24' }],
  household: hh, goals: 'g', narrative: 'n', narrativeChangedAt: '2026-10-01T09:00:00Z', currentBalance: 500,
  currentBalanceDate: '2026-10-15', lastUpdated: 't', lastDevice: 'dev_b' });

// Exactly what syncToFirebase() on main / the live build sends: sanitiseForFirebase() turns undefined into null,
// and empty {} / [] are sent as-is (the RTDB SDK treats both as a delete).
const oldClientPayload = s => JSON.parse(JSON.stringify({
  bills: s.bills, commitments: s.commitments, decisions: s.decisions, planDates: s.planDates, instalments: s.instalments,
  incomeSources: s.incomeSources, narrative: s.narrative, narrativeDate: s.narrativeDate, narrativeChangedAt: s.narrativeChangedAt,
  decisionsChanged: s.decisionsChanged, goals: s.goals, household: s.household, currentBalance: s.currentBalance,
  currentBalanceDate: s.currentBalanceDate, currentBalanceUpdatedAt: s.currentBalanceUpdatedAt, lastActuals: s.lastActuals,
  oneOffIncome: s.oneOffIncome || [], paidCommitments: s.paidCommitments || {}, history: s.history || [],
  lastUpdated: '2026-10-17T14:00:00Z', lastDevice: 'dev_a' }, (k, v) => v === undefined ? null : v));

test('round 2: beta rules vs the clients that are already deployed', async t => {
  const e = await initializeTestEnvironment({ projectId: 'demo-visible-r2',
    database: { host: hostname, port: Number(port), rules: fs.readFileSync(path.join(__dirname, 'database.rules.json'), 'utf8') } });
  t.after(() => e.cleanup());
  const db = e.unauthenticatedContext().database();
  const seed = () => e.withSecurityRulesDisabled(c => set(ref(c.database(), `households/${CODE}`), remote()));

  await t.test('RR-OK-1 a new-build sync (false sentinels, no nulls) is accepted', async () => {
    await seed();
    await assertSucceeds(update(ref(db, `households/${CODE}`), Object.assign(remote(), { decisions: false, lastDevice: 'dev_a' })));
  });

  await t.test('RR-OK-1b the new build\'s build stamp (clientVersion + member client) is accepted; junk is not', async () => {
    await seed();
    const hh2 = { household_code: CODE, members: [{ device_id: 'dev_a', name: 'A', client: '1.8.1-sync2' }] };
    await assertSucceeds(update(ref(db, `households/${CODE}`), Object.assign(remote(), { household: hh2, clientVersion: '1.8.1-sync2', lastDevice: 'dev_a' })));
    await assertFails(set(ref(db, `households/${CODE}/clientVersion`), 'x'.repeat(41)));
    await assertFails(set(ref(db, `households/${CODE}/clientVersion`), null));
  });

  await t.test('RR-OK-2 control: an old build in steady state (nothing emptied, nothing unset) still syncs', async () => {
    await e.withSecurityRulesDisabled(c => set(ref(c.database(), `households/${CODE}`), Object.assign(remote(), { instalments: { b1: { n: 2 } } })));
    await assertSucceeds(update(ref(db, `households/${CODE}`), oldClientPayload(Object.assign(remote(), { instalments: { b1: { n: 2 } },
      planDates: { b1: '2026-10-20' }, narrativeDate: 'x', decisionsChanged: 'x', currentBalanceUpdatedAt: 'x', lastActuals: { a: 1 },
      oneOffIncome: [{ id: 'o', title: 't', amount: 1 }], paidCommitments: { k: { c: true } }, history: [{ a: 1 }] }))));
  });

  await t.test('RR-BUG-1 (expected, gated by step 0) an OLD (live/main) build can no longer sync once it marks the last decided bill paid', async () => {
    // Old device: same data as the household, then the last decision is cleared → decisions:{} (= delete).
    const I = { instalments: { b1: { n: 2 } } };
    await e.withSecurityRulesDisabled(c => set(ref(c.database(), `households/${CODE}`), Object.assign(remote(), I)));
    const s = Object.assign(remote(), I, { decisions: {} }); // the ONLY difference from steady state (RR-OK-2)
    // EXPECTED to be refused: this is why step 0 (update every device first) is mandatory.
    await assertFails(update(ref(db, `households/${CODE}`), oldClientPayload(s)));
  });

  await t.test('RR-BUG-2 (expected, gated by step 0) an OLD build that never set a field (undefined → null) cannot sync over a household where it is set', async () => {
    // e.g. a phone that has never recorded a balance or a narrative edit; the other device has.
    await seed();
    const s = Object.assign(remote(), { currentBalance: undefined, currentBalanceDate: undefined, narrativeChangedAt: undefined, instalments: {} });
    await assertFails(update(ref(db, `households/${CODE}`), oldClientPayload(s))); // expected: gated by step 0
  });

  await t.test('RR-BUG-1b (expected, gated by step 0) an OLD build cannot sync over a household where a new build wrote an emptied-collection sentinel', async () => {
    await seed(); // remote instalments === false (new build); the old build reads it back as {} and sends {} → delete
    await assertFails(update(ref(db, `households/${CODE}`), oldClientPayload(Object.assign(remote(), { instalments: {} })))); // expected: gated by step 0
  });

  await t.test('RR-BUG-3 (accepted, documented) a single bill can still be deleted; whole collections cannot', async () => {
    await e.withSecurityRulesDisabled(c => set(ref(c.database(), `households/${CODE}/bills`), [{ id: 'b1', title: 'a', amount: 1 }, { id: 'b2', title: 'b', amount: 2 }]));
    // Accepted and documented ("Deletes"): removing one item is a normal edit, and the collection survives.
    await assertSucceeds(set(ref(db, `households/${CODE}/bills/0`), null));
  });
});
