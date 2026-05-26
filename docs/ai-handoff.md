# AI Handoff

Use this file as the first stop for Claude, Codex, or any other assistant picking up the repo.
It should stay short, current, and task-focused. Broader project context belongs in
`docs/project-state.md`.

---

## Current Task

Encoding repair + XSS cleanup (pass 2) are both **complete** on branch `claude-xss-cleanup-pass2`.

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

### Encoding repair (this session)

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

### Codex encoding investigation (previous session)

Codex compared production and sandbox byte-level file contents on 2026-05-26 and confirmed:
- Production (233,165 bytes): correct UTF-8 for all symbols
- Sandbox (243,382 bytes): mojibake for checkmarks, arrows, emoji, cross; pound signs appeared
  in both counts due to mojibake sequences containing the correct bytes as a substring

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
Read docs/ai-handoff.md. Encoding and XSS cleanup are both done on claude-xss-cleanup-pass2.
Pick up the next task: PWA manifest and icons. Keep it narrow and update the handoff when done.
```
