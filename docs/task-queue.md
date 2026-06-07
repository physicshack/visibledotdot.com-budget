# Task Queue — visible..

This is the flight plan. Set by the human before leaving. Agents update status as work progresses.
Live coordination happens via PR comments and labels — see `docs/unattended-ai-workflow.md`.

---

## Pending

- [ ] **Update spec docs to v1.8** | branch: `claude/update-spec-v1.8` | assigned: claude | risk: low
  - Done when: `docs/visible-spec-v1.7.md`, `docs/visible-brief-v1.7.md`, and UI label all agree on v1.8. No behaviour changes.

- [ ] **Document Firebase security rules** | branch: `claude/firebase-security-docs` | assigned: claude | risk: low
  - Done when: `docs/firebase-security.md` exists with recommended Realtime Database rules for household sync.

- [ ] **Fix income source name XSS in onclick attrs** | branch: `claude/xss-income-source-onclick` | assigned: claude | risk: low
  - Done when: `openEditIncomeSource()` and `deleteIncomeSource()` use element ID lookups instead of passing `name` into onclick attr strings.

## In Progress

_(none)_

## Done

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
