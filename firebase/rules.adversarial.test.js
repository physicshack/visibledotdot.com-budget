// Reviewer's adversarial rules tests. LOCAL EMULATOR ONLY (same guard as rules.test.js).
//   cd firebase && npx firebase emulators:exec --only database --project demo-visible "node --test rules.adversarial.test.js"
// "ADV-RULES-BUG-*" tests FAILED against the rules at b5d5f0a; they pass after the review fixes.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { ref, get, set, update } = require('firebase/database');

const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000';
if (!/^(127\.0\.0\.1|localhost):/.test(host)) throw new Error('refusing to run rules tests outside the local emulator');
const [hostname, port] = host.split(':');
const env = (file, projectId) => initializeTestEnvironment({ projectId,
  database: { host: hostname, port: Number(port), rules: fs.readFileSync(path.join(__dirname, file), 'utf8') } });

const CODE = 'PANE47';
// What syncToFirebase() actually sends for a realistic household (types as in a real export)
const syncPayload = (code, extra = {}) => Object.assign({
  bills: [{ id: 'b1', title: 'Vet', amount: '135', paid: false, paidDate: '' }],
  commitments: [{ id: 'c1', name: 'Rent', amount: 1000, due_type: 'day_of_month', due_value: 1 }],
  decisions: { b1: 'pay' }, planDates: { b1: '2026-10-20' }, instalments: {},
  incomeSources: [{ name: 'D', amount: 4200, schedule: 'monthly', nextdate: '2026-10-24' }],
  narrative: 'n', narrativeDate: '', narrativeChangedAt: '', decisionsChanged: '2026-10-17T10:00:00.000Z', goals: 'g',
  household: { household_code: code, created_by: 'dev_a', created_at: 't', members: [{ device_id: 'dev_a', name: 'A' }] },
  currentBalance: -249.8, currentBalanceDate: '2026-10-17', currentBalanceUpdatedAt: 't',
  lastActuals: {}, oneOffIncome: [], paidCommitments: { '2026-10-24': { c1: true } }, history: [],
  lastUpdated: 't', lastDevice: 'dev_a' }, extra);

test('beta rules: adversarial', async t => {
  const e = await env('database.rules.json', 'demo-visible-adv-beta');
  t.after(() => e.cleanup());
  const anon = e.unauthenticatedContext().database();
  const seed = () => e.withSecurityRulesDisabled(c => set(ref(c.database(), `households/${CODE}`), syncPayload(CODE)));

  await t.test('ADV-RULES-OK realistic sync payload is accepted (sync not broken for a 6-char household)', async () => {
    await seed();
    await assertSucceeds(update(ref(anon, `households/${CODE}`), syncPayload(CODE)));
  });

  await t.test('ADV-RULES-BUG-1 anyone with the code can still wipe every financial record (only the root node delete is blocked)', async () => {
    await seed();
    await assertFails(update(ref(anon, `households/${CODE}`), {
      bills: null, commitments: null, incomeSources: null, decisions: null, planDates: null,
      oneOffIncome: null, paidCommitments: null, history: null, currentBalance: null, narrative: null, goals: null }));
  });

  await t.test('ADV-RULES-BUG-2 a single child delete also goes through', async () => {
    await seed();
    await assertFails(set(ref(anon, `households/${CODE}/incomeSources`), null));
  });

  await t.test('ADV-RULES-BUG-3 a goals text over 5,000 chars makes EVERY sync from that device fail (atomic update, app has no limit)', async () => {
    await seed();
    await assertSucceeds(update(ref(anon, `households/${CODE}`), syncPayload(CODE, { goals: 'x'.repeat(5001) })));
  });

  // Inverted deliberately (see visible-budget-response.md, S-6): this test documented the gap as accepted
  // behaviour; nested apiKey is now blocked, so it must FAIL.
  await t.test('ADV-RULES-NOTE nested apiKey is not blocked (only a top-level apiKey is)', async () => {
    await seed();
    await assertFails(update(ref(anon, `households/${CODE}/household`), { apiKey: 'sk-x' }));
  });
});

test('auth rules: adversarial (migration)', async t => {
  const e = await env('database.rules.auth.json', 'demo-visible-adv-auth');
  t.after(() => e.cleanup());
  const mallory = e.authenticatedContext('mallory').database();
  const alice = e.authenticatedContext('alice').database();
  // An existing (legacy) household: data present, no householdMembers yet — the state of every live household on day 1
  await e.withSecurityRulesDisabled(c => set(ref(c.database(), `households/${CODE}`), syncPayload(CODE)));

  await t.test('ADV-RULES-BUG-4 the first signed-in stranger to name a legacy code becomes its member and reads it', async () => {
    await assertFails(set(ref(mallory, `householdMembers/${CODE}/mallory`), { joined: 1 }));
    await assertFails(get(ref(mallory, `households/${CODE}`)));
  });

  await t.test('ADV-RULES-BUG-5 a member can never leave (own membership cannot be deleted)', async () => {
    await e.withSecurityRulesDisabled(c => set(ref(c.database(), 'householdMembers/K7QW2MXP4R/alice'), { joined: 1 }));
    await assertSucceeds(set(ref(alice, 'householdMembers/K7QW2MXP4R/alice'), null));
  });
});
