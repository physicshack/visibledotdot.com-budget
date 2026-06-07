# Task Queue — visible..

This is the flight plan. Set by the human before leaving. Agents update status as work progresses.
Live coordination happens via PR comments and labels — see `docs/unattended-ai-workflow.md`.

---

## Pending

- [ ] **Fix income source name XSS in onclick attrs** | branch: `codex/xss-income-source-onclick` | assigned: codex | risk: low
  - Done when: `openEditIncomeSource()` and `deleteIncomeSource()` use element ID lookups instead of passing `name` into onclick attr strings.

## In Progress

_(none)_

## Done

- [x] Document Firebase security rules | PR: this branch
  - Completed by Codex on `codex/firebase-security-docs`; awaiting human review.
- [x] Update spec docs to v1.8 | PR #12 merged 2026-06-07
- [x] Unattended AI workflow established | PR #10 merged 2026-06-07
- [x] XSS cleanup pass 2 | PR #2
- [x] PWA manifest and icons | PR #2
- [x] Horizon period fixes | PRs #3–#6
- [x] Persistent refresh button | PR #7
- [x] Chart legend fix + today line | PR #8
- [x] Household balance sync fix | PR #9

---

## Human-Only Tasks (do not attempt unattended)

- Replace placeholder icons with real branded artwork
- AI backend proxy (remove Anthropic API key from browser)
- Deploy to Fasthosts live site
- Merge any PR to main
