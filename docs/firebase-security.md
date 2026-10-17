# Firebase Security Rules

This document covers recommended Firebase Realtime Database rules for visible.. household sync.

The current app uses Firebase Realtime Database directly from the browser. It does **not** currently use Firebase Authentication. That means the database rules cannot identify a real user or household member. A shared household code is useful product flow, but it is not strong security.

Official Firebase references:

- [Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Rule conditions and `auth`](https://firebase.google.com/docs/database/security/rules-conditions)
- [Rules core syntax](https://firebase.google.com/docs/database/security/core-syntax)

---

## Current App Paths

| Path | Used by | Purpose |
|---|---|---|
| `households/{code}` | household sync | Shared household data keyed by the household code (10 characters for new households, 6 for older ones) |
| `households/{code}/ping` | Firebase diagnostic | Test write for the current household |
| `feedback/{id}` | feedback form | Write-only feedback payload |

`paymind_test` is no longer used: the diagnostic only writes `households/{code}/ping`.

The household payload includes bills, commitments, decisions, plan dates, instalments, income sources, narrative, goals, current balance, one-off income, paid commitments, history, and household metadata.

---

## Exposure Under the Current Design (read this first)

There is no Firebase Authentication, so the database cannot tell a household member from anyone else. **The household code is the only secret.** Anyone who has the database URL (it is in the public app and in every export) and a household code can read the full household finances and overwrite them, with no login.

- The database URL is public, so it is not a secret.
- The code shows in the header sync pill (so it appears in screenshots) and in exported JSON.
- Old codes were 6 characters from a 32-character alphabet, made with `Math.random()`: 32^6 ≈ 1.07 billion possibilities. With a handful of households, an unthrottled scanner finds one in days, not years. Rules cannot rate-limit.
- New codes are 10 characters from `crypto.getRandomValues()`: 32^10 ≈ 1.1 × 10^15, which makes guessing impractical. They are still a bearer secret, so they only defend against guessing, not against a leaked code.

---

## Private-Beta Rules (`firebase/database.rules.json`)

Deploy these rules only by hand, after review (`cd firebase && npx firebase deploy --only database --project <id>`). Nothing in this repo deploys them automatically.

> ⚠️ **Do not publish `database.rules.json` until every device and visibledotdot.com run the new build.** Older builds (the current live site included) send empty collections as `{}`/`[]` and unset fields as `null`. Realtime Database treats both as deletes, and these rules refuse deletes. A multi-path update is all-or-nothing, so an old device's **whole** sync is rejected, every time. The device shows "offline" and its changes never reach the household. See Step 0 in the Setup Checklist.


What these rules do:

- They deny the root, the `households` list, `paymind_test` and every path that is not listed.
- They only allow `households/{code}` when `{code}` has the shape of a real code: 6 or 10 characters from the alphabet.
- **Whole household and whole-collection deletes are refused.** Nobody can delete a household, or any of its known children (`bills`, `history`, `narrative`, `household`…). **Deleting a single item inside a collection is accepted** (for example `set(households/{code}/bills/0, null)`): removing one bill is a normal edit, and the collection itself survives. This is no extra exposure, because a code holder can overwrite items anyway (see Accepted risk). There is no `.write` on `households/{code}` itself. Each known child has its own `.write`, which needs `newData.exists() || !data.exists()`. This matters because in Realtime Database a `.write` granted higher up cannot be taken back lower down, and `.validate` never runs on a delete.
- **An empty list is stored as `false`, not deleted.** Firebase drops empty arrays and objects, so the app sends `false` for an empty collection. The rules accept a collection only when it has children or is `false`.
- A household cannot be created without `household` metadata, so a stray `ping` cannot create one. `household.household_code` must match the path.
- **No key matching `api.?key|secret|password` (case-insensitive) is allowed at any depth** the app uses: 4 levels below each collection, 3 below `household`. The app never syncs keys, so this is a backstop against a future bug.
- Item `id`s must be plain tokens: letters, digits and `_ . : -`, or a number. A synced id can't carry quotes or markup. The app also normalises every synced value on the way in and escapes every string it renders, and ids never go into inline JavaScript.
- Only known child keys are allowed. Text has size limits: `goals` up to 20,000 characters, `narrative` up to 100,000, small fields up to 30–100. The app limits goals typing to 5,000 characters and trims anything longer before it syncs, with a message, so a long goal never turns into a silent sync failure.
- `feedback/{id}` is write-once and unreadable, with a 5,000-character limit on `text`.
- `householdMembers/{code}/{uid}` is the migration path to the login rules. A signed-in device can register **itself only**, **once**, for a code whose household already exists. It can also delete its own entry. Nothing else.

### Accepted risk (honest version)

These rules **still** let anyone holding a code read the household and overwrite any child with valid-shaped data. For example, they can set every collection to `false` and every text field to `""`. That is effectively a wipe, done field by field. Rules cannot tell a member from an attacker without Auth, and they cannot rate-limit. What the beta rules do achieve:

- they block a one-request delete of a whole household or a child;
- they block oversized and unknown data, and nested secrets;
- they block creating junk households.

Limit the damage:

- Treat the code like a password. The app now says so next to it.
- Use 10-character codes. 6-character codes get a warning, plus an in-app "Move to a new private code" button (see Retiring a code).
- Keep backups: More → Export.
- Move to the login rules below before inviting anyone you would not give your bank statements to.

Old builds that are still installed (the current live build included) **cannot sync at all once these rules are published** (see the warning above and Step 0). They also ignore the `false` sentinel and the `retired` flag. Update every device before you use "Move to a new private code". Otherwise an old device can re-upload its copy into the retired code.

### Retiring a code

- **In the app (beta rules):** Household → "Move to a new private code". The app copies everything to a new 10-character code, then scrubs the old node: every collection becomes `false`, every text field becomes `""`, and the member list is removed. It also marks the node `retired: true`. A device still listening on the old code sees `retired`, stops syncing and keeps its local data. Re-join it with the new code. The old node remains as an empty shell, because the beta rules refuse deletes by design.
- **Hard delete (owner only):** Firebase Console → Realtime Database → select `households/<old code>` → Delete. You can also use the CLI: `npx firebase database:remove /households/<old code> --project <id>`. These use your owner credentials and bypass rules. Check the code twice first.
- **Under the login rules:** a member can delete the whole node (`households/{code}` allows delete for members). Delete `householdMembers/{code}` afterwards from the console.

Tests run against the local emulator only:

```bash
cd firebase && npm ci && npm test   # needs Java 11+; project id is demo-*, never the live project
```

---

## Production Recommendation: login rules (`firebase/database.rules.auth.json`)

Add Firebase Authentication and a membership map, so that rules check `auth.uid` instead of trusting a household code.

```text
households/{code}/...                         (data)
householdMembers/{code}/{uid}: {joined: <ts>} (who may read/write)
invites/{code}/{token}: {expires: <ts>}       (single-use, ≤ 7 days)
```

What the rules allow (all of it is covered by emulator tests in `firebase/rules.test.js`):

- **Read and write data:** members only. A member may delete the whole household to retire it. Nested `apiKey`/secret keys are refused, down to 5 levels.
- **Create a brand-new household:** a signed-in user may add themselves as the first member, but only when neither `households/{code}` nor `householdMembers/{code}` exists yet. **Knowing an existing code is not enough to join.**
- **Join an existing household:** this needs an invite token issued by a member. The token is at least 20 random characters and expires within 7 days. The joiner adds their own member entry **and deletes the invite in the same multi-path update**. The rules check the state after the write, so a token works once, and an expired or missing token is refused.
- **Leave:** a member may delete their own `householdMembers/{code}/{uid}` entry. Members may cancel invites.
- **Invites** are unreadable. They can only be created by members, with a bounded expiry.
- **Feedback** needs sign-in. It is write-once and unreadable.

### Migration plan (order matters)

1. **App release (beta rules still live).** Load the Auth SDK with the project's **real** web config, replacing `apiKey:'paymind-local'`. Enable Anonymous sign-in, plus Email-link or Google for account recovery. On start, each device that is in a household signs in and writes `householdMembers/{code}/{auth.uid} = {joined: <ts>}` once. The beta rules allow exactly this, for the device's own uid and an existing household, and they refuse it for codes that don't exist.
2. **Add an "Invite" button.** It creates `invites/{code}/{token}` and shows a link or QR code with the token. Change join so it sends `{householdMembers/{code}/{uid}: {joined, invite: token}, invites/{code}/{token}: null}` as one update.
3. **Check** in the console that every active device has a `householdMembers` entry.
4. **Deploy `database.rules.auth.json`.** From then on, a code alone gives nothing.
5. Use "Move to a new private code", or hard-delete, for any code that was ever shared in a screenshot or export.

Until step 4, anyone who knows a code can also register a member entry for it. That is no worse than the beta rules (they can already read and write the data), and it ends at step 4. Entries from that period cannot be told apart from real ones, so after step 4 review the `householdMembers/{code}` list in the console and remove any uid that no device of yours owns.

---

## What Not To Do

Do not leave this in place:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

That makes the whole database public. Anyone with the database URL can read, write, overwrite, or delete all data.

Do not add API keys, Anthropic keys, Firebase service account keys, FTP credentials, or other secrets to Firebase data. The app intentionally does not sync API keys.

---

## Setup Checklist

**Step 0: roll out the app first. Mandatory: the rules break old clients' sync.**

1. Deploy the new build to visibledotdot.com from `main`, and check it is live: `curl -s https://visibledotdot.com/ | grep -o "APP_BUILD='[^']*'"` shows the new build id.
2. On **every** device in the household, close the app completely and reopen it, or hard-reload. The service worker can keep serving the old build until then. Make a change so that each device syncs once.
3. Confirm every device is on the new build:
   - in the app, More → Household lists each member with `build <id>`, and **no member shows "⚠ old build"**; or
   - in Firebase Console → `households/{code}/household/members`, every entry has `client` set to the new build id. `households/{code}/clientVersion` shows the last writer's build.
4. A device you can't update (old phone, browser profile) must leave the household first, or be removed from `household/members` in the console. Otherwise its sync will fail silently once the rules are published.

**Then the rules:**

5. Review `firebase/database.rules.json` and run the emulator tests (`cd firebase && npm test`).
6. Export a backup on one device (More → Export).
7. In Firebase Console → Realtime Database → Rules, publish the reviewed file (or deploy it with the CLI).
8. In visible.., open More → Advanced → Firebase Diagnostic and run it. It writes only `households/{code}/ping`.
9. Make a change on each device and confirm it syncs (the sync pill is not "offline"), including emptying a list, e.g. clearing the last decision.
10. **Rollback:** if any device shows "offline" after step 7, re-publish the previous rules from the console's rules history. Then fix that device (step 2) before trying again.
11. Never open the rules to `.read/.write: true`.

---

## Security Status

Current status: acceptable only for a private beta with trusted users, and only if household codes are treated as passwords. Deletes are blocked, but anyone holding a code can still overwrite the data field by field (see Accepted risk). Move any 6-character code, or any code that has appeared in a screenshot or export, to a new private code.

Production status: not ready until Firebase Auth or a backend proxy controls household membership.
