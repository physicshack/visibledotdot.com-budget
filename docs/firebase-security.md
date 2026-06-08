# Firebase Security Rules

This document covers recommended Firebase Realtime Database rules for visible.. household sync.

The current app uses Firebase Realtime Database directly from the browser. It does **not** currently use Firebase Authentication. That means the database rules cannot identify a real user or household member. A shared household code is useful product flow, but it is not strong security.

Official Firebase references:

- [Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Rule conditions and `auth`](https://firebase.google.com/docs/database/security/rules-conditions)
- [Rules core syntax](https://firebase.google.com/docs/database/security/core-syntax)

---

## Current App Paths

The app currently touches these database paths:

| Path | Used by | Purpose |
|---|---|---|
| `households/{code}` | household sync | Shared household data keyed by 6-character household code |
| `households/{code}/ping` | Firebase diagnostic | Test write for the current household |
| `paymind_test` | Firebase diagnostic | Test read/write path from Settings -> Advanced |
| `feedback/{id}` | feedback form | Optional user feedback payload |

The household payload includes bills, commitments, decisions, plan dates, instalments, income sources, narrative, goals, current balance, one-off income, paid commitments, history, and household metadata.

---

## Recommended Private-Beta Rules

Use this rule set only for private beta or trusted household testing.

It is safer than open root read/write because it denies unknown root paths, keeps feedback unreadable, and confines household reads/writes to the paths the app actually uses. It is **not** production-grade because anyone with the Firebase URL and a household code can read or write that household.

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "households": {
      "$code": {
        ".read": true,
        ".write": true
      }
    },
    "feedback": {
      "$id": {
        ".read": false,
        ".write": "newData.hasChildren(['text', 'type', 'ts']) && !newData.hasChild('apiKey')"
      }
    },
    "paymind_test": {
      ".read": true,
      ".write": true
    }
  }
}
```

### Notes

- Keep `paymind_test` only while the in-app Firebase diagnostic is needed. Remove or disable it when diagnostics are no longer required.
- Do not use root-level `.read: true` or `.write: true` except for a very short diagnostic test.
- Treat household codes as shareable secrets. Do not post a household code publicly.
- These rules do not protect against someone guessing or obtaining a household code.

---

## Production Recommendation

For production, add Firebase Authentication and a membership map. Then rules can check `auth.uid` instead of trusting only a household code.

Recommended future data shape:

```text
households/{code}/...
householdMembers/{code}/{uid}: true
```

Example Auth-based rules:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "households": {
      "$code": {
        ".read": "auth != null && root.child('householdMembers').child($code).child(auth.uid).val() === true",
        ".write": "auth != null && root.child('householdMembers').child($code).child(auth.uid).val() === true"
      }
    },
    "householdMembers": {
      "$code": {
        "$uid": {
          ".read": "auth != null && root.child('householdMembers').child($code).child(auth.uid).val() === true",
          ".write": false
        }
      }
    },
    "feedback": {
      "$id": {
        ".read": false,
        ".write": "auth != null && newData.hasChildren(['text', 'type', 'ts']) && !newData.hasChild('apiKey')"
      }
    },
    "paymind_test": {
      ".read": false,
      ".write": false
    }
  }
}
```

These rules require app changes before they will work:

- Add Firebase Auth sign-in.
- Store each user's Firebase Auth UID.
- Create and maintain `householdMembers/{code}/{uid}` records.
- Decide who can invite/remove members.
- Update diagnostics so they no longer depend on unauthenticated `paymind_test`.

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

1. In Firebase Console, open Realtime Database -> Rules.
2. Paste the private-beta rules above for current app compatibility.
3. Publish rules.
4. In visible.., open More -> Advanced -> Firebase Diagnostic.
5. Run the diagnostic.
6. Create or join a household and confirm sync works on two devices.
7. If the diagnostic is no longer needed, remove the `paymind_test` rule.

---

## Security Status

Current status: acceptable for private beta with trusted users only.

Production status: not ready until Firebase Auth or a backend proxy controls household membership.
