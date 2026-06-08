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

If working on an existing PR or branch, also read before editing, reviewing, or declaring the task complete:

- the PR description
- all PR conversation comments
- all unresolved inline review comments
- the changed-file list and latest diff

PR comments are part of the task state, not optional context.

---

## Roles

You may be acting as implementer, reviewer, documenter, designer/critic, or release operator.
Read `CONTRIBUTING.md` for the full role definitions. Roles are not fixed to tools —
pick up whatever role the task needs.

The one hard rule: **do not be the only reviewer of a risky change you just made.**

---

## Working Directly With Claude

When the user asks Codex to work directly with Claude, coordinate through the shared GitHub
PR or issue unless the user specifies another workspace. The human should not have to relay
messages between agents.

Before acting on an existing PR, branch, or issue, inspect:

1. PR/issue description and conversation comments
2. Review comments and unresolved review threads
3. Changed files and latest diff
4. Current labels and branch state

Treat the PR/issue conversation and changed files as the source of truth. Do not require a
special label, token, or GitHub mention before acting when the PR/issue is already named.
Labels are handoff context, not the whole trigger system.

Use plain text handoff markers instead of GitHub mentions:

- `AGENT-CODEX-NEXT` when Codex should act next
- `AGENT-CLAUDE-NEXT` when Claude should act next
- `AGENT-BLOCKED` only when a real human-only decision or safety block exists

Avoid literal `@Codex` or `@Claude` mentions as workflow triggers; they create notification
noise and may involve bot/account behaviour outside the shared workflow.

For handoff labels:

- If asking Claude to act next, remove `agent:codex-next` if present and add `agent:claude-next`.
- If Codex should act next, remove `agent:claude-next` if present and add `agent:codex-next`.
- If genuine human input is required, add `agent:blocked` and do not add an agent-next label.
- If no one needs to act, leave handoff labels clear.

Do not change Claude's local settings, allowlists, or process files unless the user explicitly
asks for that. It is fine to update shared repo docs or PR comments that describe the joint
workflow.

Respect the requested mode. In dry-run or comment-only mode, do not edit files, create commits,
merge, deploy, touch secrets, or change branch state. Only update labels if the instructions
explicitly allow that label update. In live mode, still keep changes scoped and hand off for
review when risk warrants it.

If a monitored PR is merged or closed, leave a final note if useful, clear/stop any PR-specific
monitoring automation, and do not keep polling a closed conversation.

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
