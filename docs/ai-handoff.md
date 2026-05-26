# AI Handoff

Use this file as the first stop for Claude, Codex, or any other assistant picking up the repo.
It should stay short, current, and task-focused. Broader project context belongs in
`docs/project-state.md`.

---

## Current Task

XSS cleanup pass 2 is **complete**. The focused escaping work described below has been merged.

Next recommended task: see "What's Next" below.

---

## Read First

1. `docs/ai-handoff.md`
2. `docs/project-state.md`
3. `README.md`

---

## What's Next

Suggested priorities:

1. **PWA manifest and icons** — create `manifest.json`, add 192×192 and 512×512 icons,
   add `<link rel="manifest">` to `index.html`, fix `/icon.png` reference in `sw.js`.

2. **Update spec docs to v1.8** — fix version mismatch across
   `visible-spec-v1.7.md`, `visible-brief-v1.7.md`, and UI label.

3. **Document Firebase security rules** — write `docs/firebase-security.md`
   with recommended Realtime Database rules for household sync.

4. **AI backend proxy** — remove the Anthropic API key from browser storage;
   add a lightweight serverless proxy.

5. **Extract and test calculation logic** — move date/projection functions out of `index.html`
   into `src/dates.js` and `src/projection.js` as a precursor to unit tests.

---

## Last Session Summary

Claude completed the focused XSS cleanup pass (pass 2) across `index.html`.

### Fixed in this pass

- **Alert double-escaping** — removed `escapeHTML()` from all `buildAlerts()` string
  construction. `renderAlerts()` is now the single escape point for alert title/body.
  Bill names with `&` now display correctly instead of rendering as `&amp;`.

- **Edit forms** — unescaped `value="..."` attributes now escaped in:
  - `openEditBill()`: `edit-title`, `edit-reason` textarea
  - `openEditOneOffIncome()`: `edit-inc-title`, `edit-inc-notes`
  - `openEditCommitment()`: `ec-name`
  - `openEditIncomeSource()`: `ei-name`

- **Onboarding/settings forms** — `src?.name` now escaped in:
  - `addSourceEl()`: income source name in onboarding form
  - `commitmentInnerHTML()`: commitment name in onboarding form

- **Display rows**:
  - `renderCommitmentsSection()` expanded rows: `c.name` now escaped
  - `renderCommitmentsSection()` collapsed catRows: `sl.label` now escaped
  - `renderRecurringIncomeSection()` collapsed srcRows: `src.name` now escaped
  - `renderOneOffIncomeSection()` pending and received rows: `inc.title` now escaped

- **Error messages in `innerHTML`**:
  - Chart error, Commitments error, Income error render handlers
  - AI analysis failure message
  - Camera scan error message

### Known remaining gaps (low risk, not addressed)

- `openEditIncomeSource()` and `deleteIncomeSource()` use `name` as an ID in `onclick`
  attributes (e.g. `onclick="deleteIncomeSource('${name}')"`) — user-controlled values
  in event-handler strings. Not an XSS vector in the standard browser model (the value
  would need to contain JS-injectable syntax AND survive the onclick string context), but
  worth noting for a future hardening pass. Fix: switch these to element IDs rather than
  name-based lookups.
- No automated tests on calculation or render logic — regressions require manual testing.

---

## Suggested Next Prompt

```text
Read docs/ai-handoff.md. The XSS cleanup is done. Pick up one of the "What's Next" tasks —
PWA manifest and icons is the most self-contained. Keep it narrow and update the handoff
when done.
```
