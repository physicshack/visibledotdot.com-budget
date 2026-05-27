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
- Horizon primary source fix — period anchor matches chart (largest source, not first saved) (PR #5)
- Horizon actual income display — shows real events per period, notes extra landings (PR #6)

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
   placeholders. Replace with real branded artwork before production launch.

---

## Last Session Summary

### Horizon actual income display (PR #6)

`renderHorizonSection()` was showing `totalIncome()` (fixed sum of all sources) as the income
label. A David-anchored monthly period can contain two Daisy 28-day wages, making actual period
income ~£9,600 while the card said £7,350.

**Fix:**
- New `incomeInPeriod(p)` function: walks each source schedule using `nextPayday()` to find
  events landing within `p.start..p.end`
- `actualEventsTotal` replaces `p.income` in the display label, progress bar baseline,
  tight-buffer threshold, and the fallback balance calculation
- `extraNotes`: if a source lands more than once, adds e.g. "Includes 1 extra Daisy wage"

Forecast math (chart projection, carryBal) unchanged.

### Horizon primary source alignment fix (PR #5)

`buildPeriods()` was using `incomeSources[0]` (first saved); chart uses largest-amount source.
Fix: sort by amount descending — same logic as the chart. One line change. Spotted by Codex.

### Horizon period boundary fix (PR #4)

Period end was the payday date itself; chart balance on payday includes income landing.
Fix: `end = payday − 1 day`; next period cursor starts on payday. Balance is now pre-income.
Edge case: if payday is tomorrow, period 0 spans 1 day and falls back to theoretical — not
broken, recovers after payday.

### Horizon carry-forward fix (PR #3)

Periods 1 and 2 were resetting to theoretical `income − committed` with £0 start.
Fix: `carryBal` carries period 0 chart end-balance forward through subsequent periods.
Only propagates when chart data was used; zero-balance fallback unchanged.

### PWA manifest and icons (PR #2)

`manifest.json`, `icon-192.png`, `icon-512.png`, `icon.png` added (amber placeholder icons).
`index.html` head: `<link rel="manifest">`, `<meta name="theme-color">`, apple-touch-icon.
`sw.js` rewritten: mojibake fixed, icon refs updated to `/icon-192.png`, title changed to visible..

### Encoding repair + XSS cleanup pass 2 (PR #2)

Mojibake from PowerShell `Out-File` re-encoding fixed via byte-perfect FTP file copy.
All edit forms, display rows, error messages, alert double-escape bug fixed with `escapeHTML()`.
42 call sites. Low-risk gap remains: income source name in onclick attrs (noted for future pass).

---

## Known Remaining Gaps (low risk)

- `openEditIncomeSource()` / `deleteIncomeSource()` pass `name` into `onclick` attr strings —
  user-controlled values in event-handler context. Fix: switch to element ID lookups.
- No automated tests on render logic — regressions require manual testing.

---

## Suggested Next Prompt

```text
Read docs/ai-handoff.md. All horizon fixes are merged to main (PRs #3-#6).
Pick up the next task: update spec docs to v1.8. Keep it narrow and update the handoff when done.
```
