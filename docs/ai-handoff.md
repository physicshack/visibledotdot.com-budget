# AI Handoff

Use this file as the first stop for Claude, Codex, or any other assistant picking up the repo.
It should stay short, current, and task-focused. Broader project context belongs in
`docs/project-state.md`.

---

## Current Task

All recent work is merged to `main`:
- XSS cleanup pass 2 (PR #2)
- Encoding fix + PWA manifest/icons (PR #2)
- Horizon period carry-forward fix (PR #3)

Next recommended task: see "What's Next" below.

---

## Read First

1. `docs/ai-handoff.md`
2. `docs/project-state.md`
3. `README.md`

---

## What's Next

Suggested priorities (in order):

1. **Update spec docs to v1.8** — fix version mismatch across
   `visible-spec-v1.7.md`, `visible-brief-v1.7.md`, and UI label.

2. **Document Firebase security rules** — write `docs/firebase-security.md`
   with recommended Realtime Database rules for household sync.

3. **AI backend proxy** — remove the Anthropic API key from browser storage;
   add a lightweight serverless proxy.

4. **Extract and test calculation logic** — move date/projection functions out of `index.html`
   into `src/dates.js` and `src/projection.js` as a precursor to unit tests.

5. **Replace placeholder icons** — `icon-192.png` and `icon-512.png` are simple amber/white
   placeholders generated programmatically. Replace with real branded artwork.

---

## Last Session Summary

### Horizon carry-forward fix (this session)

`renderHorizonSection()` was using the chart projection for period 0 (balance-aware) but
resetting to a theoretical `income − committed` with £0 start for periods 1 and 2. This made
the three periods inconsistent.

**Fix:** added `carryBal` — period 0's chart end-balance is carried forward as the starting
balance for period 1, then period 1's into period 2. `carryBal` is only propagated when chart
data was used, so if no balance is set, all periods still show the theoretical fallback.

### PWA manifest and icons (previous session)

Added full PWA installability support:

- **`manifest.json`** created — name, short_name, display standalone, theme/bg colours, icon entries
- **`icon-192.png`** and **`icon-512.png`** generated — amber (#b8860b) background, white "v.." text
  (simple placeholders; replace with real artwork before production launch)
- **`icon.png`** added — copy of icon-192.png for any legacy references
- **`index.html` head** updated — added `<link rel="manifest">`, `<meta name="theme-color">`,
  `<link rel="apple-touch-icon">`
- **`sw.js`** rewritten — fixed mojibake in comments, updated all icon refs from `/icon.png` to
  `/icon-192.png`, changed push notification title from 'PayMind' to 'visible..'

### Encoding repair (previous session)

The repo/sandbox `index.html` had mojibake corruption since the initial commit. The file was
originally fetched from production using PowerShell `Invoke-WebRequest | Out-File`, which
re-encoded UTF-8 multi-byte characters (£, ✓, →, ×, emoji) as double-encoded sequences.

**Fix approach:**
- User downloaded the correct production file from Fasthosts FTP (binary mode) and placed it
  at `C:\Users\User\Documents\visibledotdot\Exchange\index.html`
- File copied byte-for-byte using `[System.IO.File]::Copy()` (no encoding translation)
- All XSS escaping changes from pass 1 and pass 2 were re-applied on top of the clean file

**Verification:**
- File size: 234,214 bytes (production 233,165 + 1,049 bytes of escapeHTML additions)
- Correct £ sequences (0xC2 0xA3): 83 — matches production
- Mojibake £ sequences: 0
- escapeHTML occurrences: 42

**Root cause note:** For future deploys/fetches, always use
`[System.IO.File]::WriteAllBytes()` or `[System.IO.File]::WriteAllText(..., UTF8)`
rather than `Out-File` (which uses UTF-16 LE by default in PowerShell 5.1) or
`Invoke-WebRequest ... | Out-File` (which re-encodes the string content).

### XSS cleanup pass 2

All edit forms, display rows, error messages, and the alert double-escape bug were fixed.
No further XSS work needed at this time.

### Known remaining gaps (low risk)

- `openEditIncomeSource()` and `deleteIncomeSource()` pass the income source `name` into
  `onclick` attribute strings — user-controlled values in event-handler context. Low risk
  in practice; noted for a future hardening pass. Fix: switch to element ID lookups.
- No automated tests on render logic — regressions require manual testing.

---

## Suggested Next Prompt

```text
Read docs/ai-handoff.md. All recent fixes are merged to main (XSS, encoding, PWA, horizon).
Pick up the next task: update spec docs to v1.8. Keep it narrow and update the handoff when done.
```
