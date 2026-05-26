# visible.. — Project State
*Last updated: May 2026*

This document is the stable project-state reference for anyone picking up this repo cold.
For the current live task handoff, read `docs/ai-handoff.md` first.
Update this file whenever a significant project-state change lands.

---

## Versions

| Thing | Version | Notes |
|---|---|---|
| App (UI label) | BETA v1.8 | Shown in dashboard header |
| Service worker cache | visible-v1.8 | Bumped from v1.7 in May 2026 |
| Spec docs | v1.7 | Docs lag app — alignment is a pending task |
| Brief | v1.7 | Same |
| Positioning | v1.0 | No version in filename |

---

## Live URLs

| Environment | URL | Source |
|---|---|---|
| Production | https://visibledotdot.com | Fasthosts shared hosting, FTP deploy |
| Sandbox | https://physicshack.github.io/visibledotdot.com-budget/ | GitHub Pages, auto from `main` |
| Repo | https://github.com/physicshack/visibledotdot.com-budget | Public |

---

## Key Technical Facts

| Thing | Value |
|---|---|
| localStorage key | `paymind5` |
| Firebase project | paymind-b1d51 |
| Firebase URL | https://paymind-b1d51-default-rtdb.europe-west1.firebasedatabase.app |
| AI model | claude-sonnet-4-6 |
| Chart library | Chart.js 4.4.0 (cdnjs) |
| Font | Syne / Syne Mono (Google Fonts) |
| Framework | None — vanilla JS, single HTML file |

---

## What Has Been Done (stabilisation log)

### May 2026
- **Hardcoded Anthropic API key removed** from `DEF.apiKey` in source
  - `getApiKey()` now returns `null` if no key configured
  - Old key (`sk-ant-api03-oYlXNfWGFwselC-...`) revoked by user at console.anthropic.com
  - Settings placeholder updated to "required for AI features"
- **GitHub repo created** (`physicshack/visibledotdot.com-budget`)
  - Clean source pushed (fetched live from visibledotdot.com, key stripped)
  - Repo set public to enable GitHub Pages
  - GitHub Pages enabled — sandbox live
- **Spec docs added** to `docs/` folder
- **README written** covering purpose, local dev, file structure, data model, security notes, deployment, known limitations, contributing guide
- **Service worker bumped** from v1.7 to v1.8 (cache name `visible-v1.8`)
- **escapeHTML() added** — initial XSS protection pass applied to many dynamic `innerHTML` paths
  - See commit `04ba344` for the first escape pass
  - Follow-up cleanup is documented in `docs/ai-handoff.md`

---

## Known Flows

### Confirmed working
- Onboarding (income source entry, payday date)
- Bill add (inline form)
- Bill scan (camera + Claude API)
- Plan review (direct Claude API)
- Budget health check (direct Claude API)
- Triage mode (pay / defer / skip decisions)
- Payday mode (action queue, mark paid, celebration)
- Commitment add/edit
- Balance update (inline)
- Firebase household sync (create, join, live sync)
- CSV import
- JSON import (from Claude.ai scan prompt)
- Export/import backup
- Payday notifications (permission + scheduling)
- Horizon view (3 periods)
- Period history snapshot

### Untested / low confidence
- 1st/15th payment schedule (payday logic edge case)
- Instalment splits for deferred bills
- Firebase sync conflict resolution (concurrent edits from two devices)
- Notification delivery when browser is closed
- PWA install (no manifest / no icon yet)

---

## Known Risks (priority order)

| Risk | Severity | Status |
|---|---|---|
| API key sent directly from browser | High | Accepted for MVP — proxy planned |
| No automated tests on calculation logic | High | Planned — extract to `src/` first |
| Firebase security rules not in repo | High | User-managed; rules documented needed |
| No PWA manifest or app icon | Medium | `/icon.png` referenced but missing |
| Notification reliability (setTimeout only) | Medium | Documented limitation |
| Single 4,200-line HTML file | Medium | File split planned after tests exist |
| Docs lag app by one version | Low | Alignment task pending |
| XSS escaping cleanup incomplete | Medium | Current handoff in `docs/ai-handoff.md` |

---

## What Codex Should Pick Up Next

For the current live task, read:

- `docs/ai-handoff.md`

Do not rely on this section as a task queue. It should only point to the current handoff file.

---

## Workflow

- Claude (this tool) makes changes on `main` directly for now (solo project, rapid iteration)
- Codex branches as `codex-*`, opens PRs for review
- Both read this document to orient themselves without needing conversation history
- After significant changes, update this file
