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

### May 2026 (continued)
- **Horizon actual income display fix**
  - `renderHorizonSection()` showed `totalIncome()` (fixed sum) regardless of how many times
    each source lands in a period — a monthly David-anchored period can contain two Daisy wages
  - New `incomeInPeriod(p)` function: walks each source schedule to find actual landing events
  - `actualEventsTotal` replaces fixed income in display, progress bar, tight threshold, fallback
  - Extra-landing note: "Includes 1 extra Daisy wage" when a source pays twice in one period
  - Merged to `main` as PR #6

- **Horizon primary source alignment fix**
  - `buildPeriods()` used `incomeSources[0]` (first saved); chart uses largest-amount source
  - If these differed, horizon and chart were anchored to different pay cycles
  - Fix: sort by amount descending in `buildPeriods()` — matches chart logic
  - Spotted by Codex in PR #4 review; merged as PR #5

- **Horizon period boundary fix**
  - `buildPeriods()` was ending periods on the payday date; chart balance on that date includes
    incoming wages, making "left" show a post-income (inflated) figure
  - Fix: `end = payday − 1 day`, next period cursor starts on payday
  - Balance shown is now genuinely pre-payday; works with carry-forward fix
  - Merged to `main` as PR #4

- **Horizon carry-forward fix**
  - `renderHorizonSection()` now carries period 0's chart end-balance forward as the starting
    balance for periods 1 and 2, rather than resetting to theoretical `income − committed`
  - `carryBal` only propagates when chart data was used — zero-balance fallback unchanged
  - Merged to `main` as PR #3

- **PWA manifest and icons added**
  - `manifest.json` created (name, display standalone, theme #b8860b, icon entries)
  - `icon-192.png`, `icon-512.png`, `icon.png` generated — amber background, white "v.." text
    (simple placeholders — replace with real artwork before production launch)
  - `index.html` head updated: `<link rel="manifest">`, `<meta name="theme-color">`,
    `<link rel="apple-touch-icon">`
  - `sw.js` rewritten: mojibake in comments fixed, icon refs updated to `/icon-192.png`,
    push notification title changed from 'PayMind' to 'visible..'
  - Known risk "No PWA manifest or app icon" now resolved at medium priority

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
- **escapeHTML() added** — XSS protection applied across all known dynamic `innerHTML` paths
  - Pass 1 (commit `04ba344`): high-visibility render paths
  - Pass 2: edit forms, onboarding forms, collapsed summary rows, error messages, alert double-escape fix
  - One low-risk gap remains: `name`-based `onclick` attrs in income source edit/delete
- **Mojibake encoding fixed** — repo `index.html` had double-encoded UTF-8 since initial commit
  - Root cause: PowerShell `Out-File` re-encodes strings; affected £, ✓, →, ×, emoji
  - Fixed by byte-perfect copy from Fasthosts FTP + re-applying all XSS changes
  - Note: production FTP file still has the revoked API key — strip before pulling from FTP again

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
| No PWA manifest or app icon | Medium | ~~Fixed~~ — manifest.json + placeholder icons added |
| Notification reliability (setTimeout only) | Medium | Documented limitation |
| Single 4,200-line HTML file | Medium | File split planned after tests exist |
| Docs lag app by one version | Low | Alignment task pending |
| XSS escaping — event-handler attrs | Low | Low-risk gap; noted in `docs/ai-handoff.md` |

---

## What Codex Should Pick Up Next

For the current live task, read:

- `docs/ai-handoff.md`

Do not rely on this section as a task queue. It should only point to the current handoff file.

---

## Workflow

- Claude branches as `claude-*`, opens PRs for review
- Codex branches as `codex-*`, opens PRs for review
- Both read this document to orient themselves without needing conversation history
- After significant changes, update this file and `docs/ai-handoff.md`
