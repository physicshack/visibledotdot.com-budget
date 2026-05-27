# Contributing to visible..

This project uses a human-led, AI-assisted workflow. Any assistant (Claude, Codex, Lovable,
or another) may act in any role depending on what the task needs. Roles are not fixed to tools.

---

## Assistant Roles

| Role | Responsibility |
|---|---|
| **Implementer** | Makes a scoped change on a branch, opens a PR |
| **Reviewer** | Checks risk, correctness, docs, and whether to merge |
| **Documenter** | Updates `ai-handoff.md`, `project-state.md`, specs |
| **Designer / critic** | Evaluates UX, wording, emotional clarity |
| **Release operator** | Handles sandbox/production deploy checks |

Any assistant can play any of these roles. The important constraint is **separation**:
the same assistant should not be the only reviewer of a risky change it just made.

---

## Branch Naming

Branch prefixes indicate **provenance** (where the change came from), not authority:

```
claude/*      — change authored by Claude
codex/*       — change authored by Codex
lovable/*     — change authored by Lovable
human/*       — change authored by the developer directly
```

---

## Workflow

1. **Read the handoff first** — `docs/ai-handoff.md` is the current task source of truth
2. **Branch** — create a `<prefix>/<short-description>` branch
3. **Change narrowly** — one concern per PR; don't refactor unrelated code
4. **Open a PR** — include what changed, why, and a test plan
5. **Separate review** — risky changes should be reviewed by a different assistant or the human before merging
6. **Update docs** — after merge, update `docs/ai-handoff.md` and `docs/project-state.md`
7. **Small doc-only fixes** may go direct to `main` without a PR

---

## What Counts as Risky

- Any change to calculation logic (dates, projections, balances)
- Any change to the Firebase sync or localStorage schema
- Any change to the AI prompt or API call structure
- Any change that affects data persistence

Display-only and copy changes are low risk and can be merged with lighter review.

---

## Implementation Guardrails

These apply to all assistants acting as implementer:

- Do not change the localStorage schema (`paymind5`) without explicit instruction
- Do not change Firebase data structure without explicit instruction
- Do not add new AI calls without explicit instruction
- Do not rewrite large sections of the app to fix small problems
- Do not commit API keys, secrets, or credentials
- Do not amend commits that have already been pushed

---

## Document Ownership

| Document | Purpose | Updated by |
|---|---|---|
| `docs/ai-handoff.md` | Live task handoff — short, current | Any assistant after completing a task |
| `docs/project-state.md` | Stable reference — versions, facts, log | Any assistant after significant change |
| `CLAUDE.md` | Standing brief for Claude Code | Human or Documenter role |
| `CONTRIBUTING.md` | This file — workflow rules | Human or Documenter role |
| `docs/` spec files | Product behaviour | Documenter role, version-tracked |

---

## Commit Messages

Write the reason, not just the what:

```
Good: Fix horizon: end periods day before payday, not on payday
Bad:  Update buildPeriods function
```

Always co-author AI commits:

```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
