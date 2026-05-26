# AI Handoff

Use this file as the first stop for Claude, Codex, or any other assistant picking up the repo.
It should stay short, current, and task-focused. Broader project context belongs in
`docs/project-state.md`.

---

## Current Task

Focused XSS cleanup pass in `index.html`.

The previous escape pass improved many display paths, but it is not complete. The old note in
`docs/project-state.md` about a single `catRows` gap is inaccurate.

---

## Read First

1. `docs/ai-handoff.md`
2. `docs/project-state.md`
3. `README.md`

---

## Exact Next Steps

1. Keep using the existing `escapeHTML(str)` helper.
2. Escape remaining dynamic strings inserted into `innerHTML` attribute values or textarea bodies, especially:
   - `openEditBill()`
     - `edit-title`
     - `edit-reason` textarea body
   - `openEditOneOffIncome()`
     - `edit-inc-title`
     - `edit-inc-notes`
   - `openEditCommitment()`
     - `ec-name`
   - `openEditIncomeSource()`
     - `ei-name`
   - `addSourceEl()`
     - `src?.name`
   - `commitmentInnerHTML()`
     - `src?.name`
3. Fix expanded commitment row rendering in `renderCommitmentsSection()`:
   - Replace raw `c.name` with `escapeHTML(c.name)`.
4. Review other `innerHTML` templates for stored user, AI, Firebase, or CSV strings inside:
   - text nodes
   - `value="..."`
   - textarea contents
   - error message displays
5. Escape raw error messages before inserting into `innerHTML`, especially:
   - chart/render errors
   - direct AI analysis errors
   - camera analysis errors
6. Fix alert double-escaping:
   - `buildAlerts()` should store raw strings.
   - `renderAlerts()` should be the only place that escapes alert title/body.
7. Do not escape:
   - structural HTML
   - numbers
   - dates
   - internal IDs
   - values written with `textContent`
8. Run a JavaScript syntax check after editing.
9. Update `docs/ai-handoff.md`, `docs/project-state.md`, and `README.md` if the XSS risk status changes.

---

## Known Gotchas

- Keep raw data in state. Escape only at the `innerHTML` render boundary.
- Escaping before storing data causes double-escaping bugs later.
- Escaped strings are safe for text and quoted HTML attributes, but avoid using user-controlled values in event-handler attributes.
- The known gap is not mainly collapsed `catRows`; it is expanded commitment rows and unescaped form values.
- Keep this as a narrow safety patch. Do not split files or refactor architecture in the same change.

---

## Completion Criteria

- No known user, AI, Firebase, or CSV strings are inserted into `innerHTML` unescaped.
- Alert titles/bodies render correctly without double escaping.
- Edit forms do not break when values contain quotes, `<`, `>`, or `&`.
- JavaScript syntax check passes.
- `README.md` and `docs/project-state.md` no longer claim stale or inaccurate XSS status.

---

## Last Session Summary

Codex reviewed the repo after Claude's initial stabilisation work.

Confirmed:
- `escapeHTML()` exists.
- Many high-visibility render paths are now escaped.
- `sw.js` is bumped to `visible-v1.8`.
- `docs/project-state.md` exists and is useful as a cold-start project overview.
- The inline app script parses successfully.

Found:
- Several edit/settings/onboarding form value slots still insert stored strings without escaping.
- Expanded commitment rows still render `c.name` raw.
- Alerts are currently double-escaped.
- Some error messages are inserted into `innerHTML` raw.
- `docs/project-state.md` still points at the wrong remaining XSS gap.
- `README.md` still lists HTML escaping as unchecked.

---

## Suggested Next Prompt

```text
Read docs/ai-handoff.md first, then complete the focused XSS cleanup task described there.
Keep it narrow: no architecture refactor, no file splitting. After editing, run a syntax check
and update the handoff/project docs with what changed and what remains.
```
