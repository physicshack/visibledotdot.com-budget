# AI Handoff

Use this file as the first stop for Claude, Codex, or any other assistant picking up the repo.
It should stay short, current, and task-focused. Broader project context belongs in
`docs/project-state.md`.

---

## Current Task

XSS cleanup pass 2 is complete on branch `claude-xss-cleanup-pass2`.

Current urgent task: fix sandbox/repo text encoding mojibake in `index.html`.

The GitHub Pages sandbox is rendering weird characters because the repo copy of
`index.html` contains already-corrupted UTF-8 text. This is not caused by the recent
handoff/docs changes.

---

## Read First

1. `docs/ai-handoff.md`
2. `docs/project-state.md`
3. `README.md`

---

## What's Next

Suggested priorities:

1. **Fix repo/sandbox mojibake in `index.html`**.
   - Production `https://visibledotdot.com/` has correct UTF-8 bytes for symbols.
   - Sandbox `https://physicshack.github.io/visibledotdot.com-budget/` has mojibake bytes.
   - Repair this before PWA/icons/docs polish, otherwise the sandbox remains hard to review.
   - Preserve the XSS cleanup from `claude-xss-cleanup-pass2`; do not blindly replace the
     branch file with production if that would lose escaping fixes.

2. **PWA manifest and icons** - create `manifest.json`, add 192x192 and 512x512 icons,
   add `<link rel="manifest">` to `index.html`, fix `/icon.png` reference in `sw.js`.

3. **Update spec docs to v1.8** - fix version mismatch across
   `visible-spec-v1.7.md`, `visible-brief-v1.7.md`, and UI label.

4. **Document Firebase security rules** - write `docs/firebase-security.md`
   with recommended Realtime Database rules for household sync.

5. **AI backend proxy** - remove the Anthropic API key from browser storage;
   add a lightweight serverless proxy.

6. **Extract and test calculation logic** - move date/projection functions out of `index.html`
   into `src/dates.js` and `src/projection.js` as a precursor to unit tests.

---

## Encoding Investigation

Codex compared production and sandbox byte-level file contents on 2026-05-26.

Production:
- URL: `https://visibledotdot.com/`
- Status: 200
- Bytes: 233165
- UI label: `BETA v1.8`
- Correct UTF-8 byte counts:
  - chart emoji: 2
  - check mark: 46
  - arrow: 38
  - pound sign: 83
  - multiplication/cross: 6
- Mojibake byte counts for those same symbols: 0

Sandbox:
- URL: `https://physicshack.github.io/visibledotdot.com-budget/`
- Status: 200
- Bytes: 243382
- UI label: `BETA v1.8`
- Correct UTF-8 byte counts:
  - chart emoji: 0
  - check mark: 0
  - arrow: 0
  - pound sign: 83
  - multiplication/cross: 0
- Mojibake byte counts:
  - chart emoji sequence: 2
  - check mark sequence: 46
  - arrow sequence: 38
  - pound sign sequence: 83
  - multiplication/cross sequence: 6

Conclusion:
- The production file has the correct symbol bytes.
- The sandbox/repo file has mojibake already stored in `index.html`.
- `<meta charset="UTF-8">` exists in both files, so this is not a missing charset tag.
- Recent handoff/docs commits did not modify `index.html`; the corruption existed in the repo copy.

Recommended repair approach:
1. Work on `claude-xss-cleanup-pass2` or a new branch from it.
2. Repair mojibake in `index.html` while preserving the XSS cleanup.
3. Validate syntax after repair.
4. Open the sandbox and visually check the bottom nav/icons/buttons, pound signs, arrows, checks,
   and settings/camera screens.
5. Update this handoff with exactly how the repair was done.

---

## Last Session Summary

Claude completed the focused XSS cleanup pass (pass 2) across `index.html`.

### Fixed in the XSS pass

- **Alert double-escaping** - removed `escapeHTML()` from all `buildAlerts()` string
  construction. `renderAlerts()` is now the single escape point for alert title/body.
  Bill names with `&` now display correctly instead of rendering as `&amp;`.

- **Edit forms** - unescaped `value="..."` attributes now escaped in:
  - `openEditBill()`: `edit-title`, `edit-reason` textarea
  - `openEditOneOffIncome()`: `edit-inc-title`, `edit-inc-notes`
  - `openEditCommitment()`: `ec-name`
  - `openEditIncomeSource()`: `ei-name`

- **Onboarding/settings forms** - `src?.name` now escaped in:
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
  attributes (e.g. `onclick="deleteIncomeSource('${name}')"`) - user-controlled values
  in event-handler strings. Not an XSS vector in the standard browser model (the value
  would need to contain JS-injectable syntax AND survive the onclick string context), but
  worth noting for a future hardening pass. Fix: switch these to element IDs rather than
  name-based lookups.
- No automated tests on calculation or render logic - regressions require manual testing.

---

## Suggested Next Prompt

```text
Read docs/ai-handoff.md. XSS cleanup pass 2 is done, but the sandbox/repo index.html has
mojibake while production has correct UTF-8 symbols. Fix the repo/sandbox encoding issue first,
preserving the XSS cleanup on claude-xss-cleanup-pass2. Keep it narrow and update the handoff
with what changed.
```
