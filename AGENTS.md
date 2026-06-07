# AGENTS.md — Standing Brief for Codex

This file is read automatically by Codex at session start.
It is the minimum context needed to work on this repo without conversation history.
For the current task, always read `docs/ai-handoff.md` first.

---

## What This Project Is

**visible..** is a mobile-first personal finance web app for people with ADHD or chaotic
short-term money situations. It is not a generic budget tracker.

The three questions it answers:
1. Am I okay until payday?
2. What do I need to do next?
3. Can I stop thinking about this for now?

Tone: calm, factual, never shaming. No over-celebration, no banking-app coldness.

---

## Key Facts

| Thing | Value |
|---|---|
| Single source file | `index.html` (~4,200 lines, vanilla JS) |
| localStorage key | `paymind5` |
| Firebase project | `paymind-b1d51` |
| Firebase URL | `https://paymind-b1d51-default-rtdb.europe-west1.firebasedatabase.app` |
| AI model | `claude-sonnet-4-6` |
| App version (UI) | `BETA v1.8` |
| Sandbox | `https://physicshack.github.io/visibledotdot.com-budget/` |
| Production | `https://visibledotdot.com` (Fasthosts FTP deploy) |
| Repo | `https://github.com/physicshack/visibledotdot.com-budget` |

---

## Read First

In order:

1. `docs/ai-handoff.md` — current task, what's done, what's next
2. `docs/project-state.md` — stable reference, versions, known risks
3. `README.md` — local dev, file structure, deployment
4. `docs/unattended-ai-workflow.md` — signalling convention, task queue, full execution rules

---

## Roles

You may be acting as implementer, reviewer, documenter, designer/critic, or release operator.
Read `CONTRIBUTING.md` for the full role definitions. Roles are not fixed to tools —
pick up whatever role the task needs.

The one hard rule: **do not be the only reviewer of a risky change you just made.**

---

## Hard Constraints

Never do these without explicit instruction:

- Change the localStorage schema (`paymind5` key or data structure)
- Change Firebase data paths or structure
- Add new AI API calls
- Commit an API key, secret, or credential
- Push directly to `main` with calculation logic changes (open a PR)
- Rewrite large sections of the app to fix small problems

---

## Encoding

The production file uses UTF-8. **Never re-encode `index.html`.**

If working on Windows, never use PowerShell `Out-File` to write or copy `index.html` —
it re-encodes to UTF-16 LE and corrupts multi-byte characters (£, ✓, →, ×).

Always write files with explicit UTF-8 encoding. On Windows use:
```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
```

On Linux/macOS the default is usually UTF-8 — verify before writing.

---

## XSS Protection

All user/AI/Firebase data written to `innerHTML` must go through `escapeHTML()`.
This function is defined near line 715 of `index.html`. There are 42+ call sites.
Do not add new `innerHTML` assignments without wrapping dynamic values in `escapeHTML()`.

---

## Branch and PR Convention

- Branch as `codex/<short-description>`
- Open a PR for all non-trivial changes
- Doc-only fixes may go direct to `main`
- After merge: update `docs/ai-handoff.md` and `docs/project-state.md`
- Co-author commit messages with: `Co-Authored-By: Codex <noreply@openai.com>`

---

## What Not to Touch (unless explicitly asked)

- `manifest.json` — PWA manifest, stable
- `sw.js` — service worker, stable
- Firebase security rules — user-managed, not in repo
- `.gitignore` — set deliberately; `.claude/` is intentionally excluded
