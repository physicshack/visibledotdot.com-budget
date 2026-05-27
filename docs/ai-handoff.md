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
- Horizon period boundary fix — end day before payday, not on payday (PR #4)
- Horizon primary source fix — period anchor now matches chart (largest source, not first saved) (PR #5)

Next recommended task: fix the Horizon income summary display. See "What's Next" below.

---

## Read First

1. `docs/ai-handoff.md`
2. `docs/project-state.md`
3. `README.md`

---

## What's Next

Suggested priorities (in order):

1. **Fix Horizon income summary display** - current forecast math appears correct, but the
   card summary can under-report income for a period. Example from sandbox: `Period +3`
   showed `GBP5050 left` while the card said `Income GBP7350`; that period was anchored to
   David wage and included two Daisy wages, so actual income inside the period was about
   `GBP9600`. Clean fix: keep the chart/horizon math, but derive and display actual income
   events inside each period. Add a short explanatory line for unusual cases, e.g.
   `Includes extra Daisy wage GBP2250`, so high balances are understandable.

2. **Update spec docs to v1.8** - fix version mismatch across
   `visible-spec-v1.7.md`, `visible-brief-v1.7.md`, and UI label.

3. **Document Firebase security rules** - write `docs/firebase-security.md`
   with recommended Realtime Database rules for household sync.

4. **AI backend proxy** - remove the Anthropic API key from browser storage;
   add a lightweight serverless proxy.

5. **Extract and test calculation logic** - move date/projection functions out of `index.html`
   into `src/dates.js` and `src/projection.js` as a precursor to unit tests.

6. **Replace placeholder icons** - `icon-192.png` and `icon-512.png` are simple amber/white
   placeholders generated programmatically. Replace with real branded artwork.

---

## Last Session Summary

### Horizon income summary display gap (current next task)

After PR #5, Horizon periods are now anchored to the same largest income source as the chart.
That made the forecast more consistent, but exposed a display mismatch: the headline balance
uses the chart projection, while the card text still says `Income GBP7350` from `totalIncome()`.

This can be misleading when a period contains more than one occurrence of a smaller income
source. Real example from sandbox: `Period +3` showed `GBP5050 left`; this looked too high until
we noticed the David-anchored period included two Daisy wages. The balance is plausible, but the
summary should show actual income events inside the period rather than a fixed income total.

Preferred fix: do not change the forecast math. In `renderHorizonSection()`, derive the actual
income events for each period and display the real period income total. If a source occurs more
than once, add a plain-English note such as `Includes extra Daisy wage GBP2250`.

### Horizon primary source alignment fix (this session)

`buildPeriods()` was using `incomeSources[0]` (first saved) to anchor period boundaries.
`buildDailyBalances()` (the chart) uses the largest-amount source. If these differed, the
horizon and chart defined periods around different pay cycles.

**Fix:** sort by amount descending in `buildPeriods()` — same logic as the chart. One line change.
Spotted by Codex in review of PR #4. Merged as PR #5.

### Horizon period boundary fix (this session)

`buildPeriods()` was setting the period end to the payday date itself. The chart balance
on payday includes that day's income landing, so "left" showed a post-income (inflated) figure.

**Fix:** `end = payday − 1 day`; next period cursor starts on payday. Balance shown is now
genuinely pre-payday. Works correctly with the carry-forward fix (PR #3).

**Edge case:** if payday is tomorrow, period 0 spans a single day — chart lookup falls back to
theoretical (`income − committed`). Not ideal but not broken; recovers after payday.

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
Read docs/ai-handoff.md. All recent fixes are merged to main (XSS, encoding, PWA, horizon carry-forward, horizon period boundary, horizon primary source).
Pick up the next task: fix the Horizon income summary display. Keep the forecast math intact; display actual income events/totals inside each period so cases like two Daisy wages in one David-anchored period are explained. Update the handoff when done.
```
