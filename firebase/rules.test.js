// Realtime Database rules tests. Runs ONLY against the local emulator
// (npm test → firebase emulators:exec). Never point this at the live project.
'use strict';
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { ref, get, set, update } = require('firebase/database');

const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000';
if (!/^(127\.0\.0\.1|localhost):/.test(host)) throw new Error('refusing to run rules tests outside the local emulator');
const [hostname, port] = host.split(':');

async function env(rulesFile, projectId) {
  return initializeTestEnvironment({
    projectId,
    database: { host: hostname, port: Number(port), rules: fs.readFileSync(path.join(__dirname, rulesFile), 'utf8') },
  });
}
const household = code => ({ household_code: code, members: [{ device_id: 'dev_a', name: 'A' }] });
const payload = code => ({ bills: [{ id: 1, title: 'x', amount: 10 }], commitments: [{ id: 'c', name: 'Rent', amount: 900 }],
  incomeSources: [{ name: 'D', amount: 2000, schedule: 'monthly', nextdate: '2026-10-24' }],
  household: household(code), lastUpdated: 't', lastDevice: 'dev_a', currentBalance: 10, goals: 'g', narrative: 'n' });

test('beta rules (database.rules.json): the code is the secret, but no listing, no deletes, no junk', async t => {
  const e = await env('database.rules.json', 'demo-visible-beta');
  t.after(() => e.cleanup());
  const anon = e.unauthenticatedContext().database();
  const seed = () => e.withSecurityRulesDisabled(async c => {
    await set(ref(c.database(), 'households/PANE47'), payload('PANE47'));
    await set(ref(c.database(), 'paymind_test'), { msg: 'old' });
  });
  await seed();

  await t.test('root, the household list and the old diagnostic path are not readable', async () => {
    await assertFails(get(ref(anon, '/')));
    await assertFails(get(ref(anon, 'households')));
    await assertFails(get(ref(anon, 'paymind_test')));
  });
  await t.test('a valid code is readable and writable without auth (accepted beta risk)', async () => {
    await assertSucceeds(get(ref(anon, 'households/PANE47')));
    await assertSucceeds(update(ref(anon, 'households/PANE47'), payload('PANE47')));
    await assertSucceeds(set(ref(anon, 'households/PANE47/ping'), { ts: 1 }));
    await assertSucceeds(update(ref(anon, 'households/K7QW2MXP4R'), payload('K7QW2MXP4R')));
  });
  await t.test('malformed codes are rejected', async () => {
    for (const bad of ['pane47', 'PANE40', 'ABC', 'K7QW2MXP4R5', 'IIIIII']) {
      await assertFails(get(ref(anon, `households/${bad}`)));
      await assertFails(update(ref(anon, `households/${bad}`), payload(bad)));
    }
  });
  await t.test('S-1 deletes are refused: whole node, any known child, or every child at once (single items inside a collection are not covered; see RR-BUG-3)', async () => {
    await seed();
    await assertFails(set(ref(anon, 'households/PANE47'), null));
    await assertFails(set(ref(anon, 'households/PANE47'), payload('PANE47')), 'whole-node set (would drop children) is refused');
    for (const k of ['bills', 'commitments', 'incomeSources', 'household', 'goals', 'narrative', 'currentBalance'])
      await assertFails(set(ref(anon, `households/PANE47/${k}`), null), k);
    await assertFails(update(ref(anon, 'households/PANE47'), { bills: null }));
  });
  await t.test('S-1 an emptied collection is synced as false and accepted; a delete of something absent is a no-op', async () => {
    await seed();
    await assertSucceeds(update(ref(anon, 'households/PANE47'), { bills: false, oneOffIncome: null, history: null }));
    await assertFails(update(ref(anon, 'households/PANE47'), { bills: true }));
    await assertFails(update(ref(anon, 'households/PANE47'), { bills: 'x' }));
  });
  await t.test('S-4 the app\'s "move to a new code" scrub of the old node is accepted', async () => {
    await seed();
    const scrub = { household: { household_code: 'PANE47', retired: true, retired_at: 't' }, narrative: '', narrativeDate: '',
      narrativeChangedAt: '', decisionsChanged: '', goals: '', currentBalance: '', currentBalanceDate: '', currentBalanceUpdatedAt: '',
      lastUpdated: 't', lastDevice: 'dev_a' };
    for (const k of ['bills', 'commitments', 'decisions', 'planDates', 'instalments', 'incomeSources', 'lastActuals', 'oneOffIncome', 'paidCommitments', 'history']) scrub[k] = false;
    await assertSucceeds(update(ref(anon, 'households/PANE47'), scrub));
  });
  await t.test('S-2 ids must be plain tokens (no quotes or markup) so they cannot carry script', async () => {
    await seed();
    await assertFails(set(ref(anon, 'households/PANE47/bills/0/id'), "x');alert(1);//"));
    await assertFails(set(ref(anon, 'households/PANE47/commitments'), [{ id: '<img src=x onerror=alert(1)>', title: 't' }]));
    await assertSucceeds(set(ref(anon, 'households/PANE47/bills/0/id'), 'b_1715000000000'));
    await assertSucceeds(set(ref(anon, 'households/PANE47/bills/0/id'), 1715000000000));
  });
  await t.test('cannot write the root or the old diagnostic path', async () => {
    await assertFails(set(ref(anon, '/'), { a: 1 }));
    await assertFails(set(ref(anon, 'paymind_test'), { msg: 'x' }));
  });
  await t.test('validation: no apiKey at any depth, no unknown keys, household code must match path, no ping-only create', async () => {
    await seed();
    await assertFails(update(ref(anon, 'households/PANE47'), { apiKey: 'sk-x' }));
    await assertFails(update(ref(anon, 'households/PANE47/household'), { apiKey: 'sk-x' }));
    await assertFails(set(ref(anon, 'households/PANE47/bills/0/apiKey'), 'sk-x'));
    await assertFails(set(ref(anon, 'households/PANE47/household/members/0/api_key'), 'sk-x'));
    await assertFails(set(ref(anon, 'households/PANE47/history/0/billsPaid/0/secret'), 'x'));
    await assertFails(update(ref(anon, 'households/PANE47'), { junk: 'x' }));
    await assertFails(update(ref(anon, 'households/PANE47'), { household: household('OTHER2') }));
    await assertFails(set(ref(anon, 'households/ZZZZZZ/ping'), { ts: 1 }));
  });
  await t.test('S-5b long goals (up to 20,000 chars) sync; beyond the limit is refused', async () => {
    await seed();
    await assertSucceeds(update(ref(anon, 'households/PANE47'), { goals: 'x'.repeat(20000) }));
    await assertFails(update(ref(anon, 'households/PANE47'), { goals: 'x'.repeat(20001) }));
  });
  await t.test('S-4 migration: a signed-in device that knows an existing code can register itself (and leave)', async () => {
    const dev = e.authenticatedContext('dev-uid').database();
    await assertFails(set(ref(anon, 'householdMembers/PANE47/x'), { joined: 1 }), 'needs sign-in');
    await assertFails(set(ref(dev, 'householdMembers/PANE47/other-uid'), { joined: 1 }), 'only itself');
    await assertFails(set(ref(dev, 'householdMembers/ZZZZZZ/dev-uid'), { joined: 1 }), 'household must exist');
    await assertSucceeds(set(ref(dev, 'householdMembers/PANE47/dev-uid'), { joined: 1 }));
    await assertSucceeds(get(ref(dev, 'householdMembers/PANE47')));
    await assertSucceeds(set(ref(dev, 'householdMembers/PANE47/dev-uid'), null));
  });
  await t.test('feedback is write-once and not readable', async () => {
    await assertSucceeds(set(ref(anon, 'feedback/1_abc'), { text: 'hi', type: 'bug', ts: 'now' }));
    await assertFails(set(ref(anon, 'feedback/1_abc'), { text: 'overwrite', type: 'bug', ts: 'now' }));
    await assertFails(get(ref(anon, 'feedback')));
    await assertFails(get(ref(anon, 'feedback/1_abc')));
    await assertFails(set(ref(anon, 'feedback/2_abc'), { text: 'x'.repeat(6000), type: 'bug', ts: 'now' }));
  });
});

test('auth rules (database.rules.auth.json): membership, not the code, grants access', async t => {
  const e = await env('database.rules.auth.json', 'demo-visible-auth');
  t.after(() => e.cleanup());
  const alice = e.authenticatedContext('alice').database();
  const bob = e.authenticatedContext('bob').database();
  const carol = e.authenticatedContext('carol').database();
  const mallory = e.authenticatedContext('mallory').database();
  const anon = e.unauthenticatedContext().database();
  const CODE = 'K7QW2MXP4R';
  const token = 'tok_' + 'a'.repeat(28);

  await t.test('creator joins a brand-new household, then writes it', async () => {
    await assertSucceeds(set(ref(alice, `householdMembers/${CODE}/alice`), { joined: 1 }));
    await assertSucceeds(set(ref(alice, `households/${CODE}`), payload(CODE)));
  });
  await t.test('knowing the code is not enough', async () => {
    await assertFails(get(ref(anon, `households/${CODE}`)));
    await assertFails(get(ref(mallory, `households/${CODE}`)));
    await assertFails(set(ref(mallory, `householdMembers/${CODE}/mallory`), { joined: 1 }));
    await assertFails(set(ref(mallory, `householdMembers/${CODE}/alice`), { joined: 1 }));
    await assertFails(get(ref(mallory, `householdMembers/${CODE}`)));
  });
  await t.test('a member issues an invite; the invitee joins by consuming it in the same write', async () => {
    await assertFails(set(ref(mallory, `invites/${CODE}/${token}`), { expires: Date.now() + 3600e3 }));
    await assertFails(set(ref(alice, `invites/${CODE}/short`), { expires: Date.now() + 3600e3 }));
    await assertFails(set(ref(alice, `invites/${CODE}/${token}`), { expires: Date.now() + 30 * 864e5 }));
    await assertSucceeds(set(ref(alice, `invites/${CODE}/${token}`), { expires: Date.now() + 3600e3 }));
    await assertFails(get(ref(bob, `invites/${CODE}/${token}`)));
    await assertFails(set(ref(bob, `householdMembers/${CODE}/bob`), { joined: 1, invite: 'wrong' }));
    await assertFails(set(ref(bob, `householdMembers/${CODE}/bob`), { joined: 1, invite: token }), 'must consume the invite');
    await assertSucceeds(update(ref(bob), { [`householdMembers/${CODE}/bob`]: { joined: 1, invite: token }, [`invites/${CODE}/${token}`]: null }));
    await assertSucceeds(get(ref(bob, `households/${CODE}`)));
  });
  await t.test('S-4 invites are single-use', async () => {
    await assertFails(update(ref(carol), { [`householdMembers/${CODE}/carol`]: { joined: 1, invite: token }, [`invites/${CODE}/${token}`]: null }));
    await assertFails(get(ref(carol, `households/${CODE}`)));
  });
  await t.test('expired invites do not work', async () => {
    const old = 'tok_' + 'b'.repeat(28);
    await e.withSecurityRulesDisabled(c => set(ref(c.database(), `invites/${CODE}/${old}`), { expires: Date.now() - 1000 }));
    await assertFails(update(ref(mallory), { [`householdMembers/${CODE}/mallory`]: { joined: 1, invite: old }, [`invites/${CODE}/${old}`]: null }));
  });
  await t.test('S-4 a member can leave, and is then locked out', async () => {
    await assertSucceeds(set(ref(bob, `householdMembers/${CODE}/bob`), null));
    await assertFails(get(ref(bob, `households/${CODE}`)));
    await assertFails(set(ref(bob, `householdMembers/${CODE}/alice`), null), 'cannot remove someone else');
  });
  await t.test('S-4 legacy household (data, no members): nobody can claim it without an invite', async () => {
    await e.withSecurityRulesDisabled(c => set(ref(c.database(), 'households/PANE47'), payload('PANE47')));
    await assertFails(set(ref(mallory, 'householdMembers/PANE47/mallory'), { joined: 1 }));
  });
  await t.test('members can retire (delete) their household; no apiKey at any depth; anonymous feedback refused', async () => {
    await assertFails(update(ref(alice, `households/${CODE}`), { apiKey: 'sk-x' }));
    await assertFails(set(ref(alice, `households/${CODE}/household/apiKey`), 'sk-x'));
    await assertFails(set(ref(alice, `households/${CODE}/bills/0/apiKey`), 'sk-x'));
    await assertFails(set(ref(anon, 'feedback/1_x'), { text: 'hi', type: 'bug', ts: 'now' }));
    await assertSucceeds(set(ref(alice, 'feedback/1_x'), { text: 'hi', type: 'bug', ts: 'now' }));
    await assertFails(set(ref(mallory, `households/${CODE}`), null));
    await assertSucceeds(set(ref(alice, `households/${CODE}`), null));
  });
});
