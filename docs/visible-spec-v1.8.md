# Visible.. — Product Specification v1.8
*ADHD-aware financial planning and executive function scaffolding*
*Last updated: June 2026*

---

## 1. Product Vision

**visible..** is a mobile-first personal finance web app for people with ADHD or chaotic short-term money situations. It is not a generic budget tracker.

The app answers three practical questions:

1. Am I okay until payday?
2. What do I need to do next?
3. Can I stop thinking about this for now?

Visible.. Finance, Module 1 of the Visible.. Executive Function as a Service platform, separates two different cognitive loads:

- **Plan** — see the full picture and decide calmly what to pay, defer, or skip.
- **Pay** — on payday, execute one action at a time with minimal distraction.

The app must never conflate deciding with executing.

---

## 2. Emotional Design Contract

Visible.. exists to help the user feel supported and financially safe enough to act.

Many users arrive dysregulated, avoidant, ashamed, or afraid. The app must not amplify that state. It should calmly sort financial interruptions into clear next actions.

Visible should:

- reduce fear of opening the app
- avoid shame, blame, or dramatic language
- explain consequence without catastrophising
- always pair risk with a next safe action
- show what can wait as clearly as what needs action
- remember decisions so the user does not have to
- end each session with a calm handoff

Desired start state:

> I trust Visible.. not to scare me. It will help me make a realistic plan with minimal stress.

Desired end state:

> I know where I am. I know what happens next. I do not have to hold this in my head.

---

## 3. Voice Rules

Visible is calm, concise, specific, and protective.

Use:

- Needs attention
- Safest next step
- Okay to wait
- Scheduled
- Contact first
- You're up to date
- Best next steps
- Best handled today

Avoid:

- Danger
- Critical
- Failure
- Panic
- Urgent unless truly time-sensitive
- Long explanations by default

---

## 4. Current Version and Deployment

| Thing | Value |
|---|---|
| Product | visible.. |
| App version | BETA v1.8 |
| Main app file | `index.html` |
| Service worker | `sw.js` |
| localStorage key | `paymind5` |
| Firebase project | `paymind-b1d51` |
| Firebase URL | `https://paymind-b1d51-default-rtdb.europe-west1.firebasedatabase.app` |
| Sandbox | `https://physicshack.github.io/visibledotdot.com-budget/` |
| Production | `https://visibledotdot.com` |
| Production deploy | Manual Fasthosts FTP upload of `index.html` and `sw.js` |

v1.8 includes the stabilisation fixes merged through PR #9: XSS cleanup, PWA manifest/icons, horizon period fixes, persistent plan-review refresh, chart legend/today line, and household balance sync timestamp handling.

---

## 5. Architecture

### Single-file HTML app

- `index.html` contains the app shell, CSS, JavaScript, state management, calculations, AI calls, camera flow, and Firebase sync.
- No build step is required.
- The app can run as static files on any HTTPS host.
- Camera and service worker features require HTTPS or localhost.

### Supporting files

- `sw.js` handles service worker caching and payday push notification scheduling.
- `manifest.json`, `icon-192.png`, `icon-512.png`, and `icon.png` support PWA installation.
- `README.md` documents local running and deployment.

### External dependencies

- Chart.js 4.4.0 for balance projection charts.
- Firebase 9.23.0 compat SDK for optional household sync.
- Anthropic Claude API for plan review, budget health check, and bill scanning.
- Google Fonts: Syne and Syne Mono.

---

## 6. Data Model

All state lives in one `S` object, serialised to localStorage under `paymind5` and optionally synced through Firebase.

Key state groups:

| Group | Purpose |
|---|---|
| `incomeSources` | Recurring income schedules and next payday dates |
| `oneOffIncome` | Expected one-time income items |
| `bills` | Scanned, imported, or manually-added bills |
| `decisions` | Per-bill pay/defer/skip choice |
| `planDates` | Intended action date used for chart placement |
| `instalments` | Deferred bill payment plans |
| `commitments` | Regular monthly outgoings |
| `paidCommitments` | Per-period paid state for commitments |
| `lastActuals` | Last real commitment amount/date |
| `currentBalance` | User-entered real bank balance |
| `currentBalanceDate` | Date the current balance was recorded |
| `narrative` | Last AI plan review output |
| `observationCards` | Budget health observations |
| `household` | Firebase household sync metadata |
| `history` | Per-period snapshots after payday completion |

Hard rule: do not change the `paymind5` key or state shape without explicit approval.

---

## 7. Modes

### Plan mode

Plan mode is the full dashboard. It shows payday countdown, balance, bills, commitments, income, chart, horizon cards, AI narrative, alerts, and next actions.

It is for calm decision-making.

### Pay mode

Pay mode is an execution surface. It shows one bill at a time, a large mark-paid action, progress dots, celebration on payment, and a payday update modal after the last bill.

It is for doing, not deciding.

---

## 8. Balance Projection and Horizon

`buildDailyBalances(horizonDays)` is the single source of truth for chart projection data. It is called once at the top of `renderDashboard()` and stored in module-level `chartData`.

All sections that need projection data read from `chartData`; they do not recalculate independently.

Important rules:

- Primary period anchor is the largest income source, matching chart behaviour.
- Period end is the day before payday, not payday itself.
- Current balance snaps the projection to the user-entered real balance on its recorded date.
- Horizon period 0 reads from chart data when available.
- Later horizon periods carry forward end balance rather than resetting to zero.
- Horizon income display uses actual income events within the period, including extra wage landings.

Horizon cards show both cash-crunch point and end balance where useful, for example:

```text
This period    ↓ £240 on 22 May → £1,408 end
```

---

## 9. Core Product Surfaces

### Dashboard

- Visible.. brand and BETA v1.8 label.
- Plan/Pay segmented control.
- Household sync pill.
- Payday countdown.
- Balance card.
- Alerts.
- Chart and horizon cards.
- AI narrative with persistent refresh control.

### Commitments

- Collapsed by default.
- Pie chart and category table.
- Add action always visible.
- Expanded list supports edit and paid toggle.

### Income

- Collapsed by default.
- Recurring income and one-time income are visible in the model.
- `+ One-time` and `+ Source` are available from the section header.

### Bills

- Bill cards show urgency, category, title, sender, due date, amount, AI recommendation, decision controls, plan date, instalments, edit, and delete.
- Manual add is always available from the bills header.

---

## 10. AI Features

The app calls the Anthropic Claude API directly from the browser for:

- Plan review / situational analysis.
- Bill scanning from camera or uploaded image.
- Budget health check observations.

Prompt requirements:

- Include today's date and year explicitly.
- Use true buffer, not gross income.
- Use real calendar dates.
- Respect deferred and skipped decisions.
- Split payment plans into separate items rather than summing them.
- Keep output concise and non-shaming.

Security note: browser-direct API calls expose user-supplied API keys to localStorage. A backend proxy is planned and remains human-only / high-risk until explicitly authorised.

---

## 11. Household Sync

Household sync is optional and uses Firebase Realtime Database.

- Device A creates a household code.
- Device B joins with the code.
- State writes on `save()`.
- Own writes are ignored via device identity.
- v1.8 includes balance sync fixes: `currentBalanceUpdatedAt` timestamp handling, balance copied on join, and same-day edits resolved correctly.

Firebase security rules are not stored in this repo and must not be changed unattended.

---

## 12. Reliability and Safety Rules

- All user, AI, and Firebase data written to `innerHTML` must go through `escapeHTML()`.
- Render sections should be individually guarded so one failure does not blank the app.
- Render functions should not mutate state.
- Do not add new AI calls without explicit approval.
- Do not touch secrets, production Firebase data, or deployment unattended.
- Do not merge or deploy without the human.

---

## 13. Known Gaps

- Firebase security rules need documented recommended settings.
- API calls still happen directly from the browser.
- Calculation logic has not yet been extracted into testable modules.
- No automated test suite exists yet.
- Income source names are still passed into some inline `onclick` attributes; this is a low-risk XSS cleanup task queued for later.
- Placeholder PWA icons should be replaced with branded artwork before production launch.

---

## 14. Roadmap

### Next safe unattended tasks

- Document Firebase security rules.
- Fix income source name XSS in inline event handlers.
- Continue documentation alignment where Claude review finds gaps.

### Human-only / high-risk tasks

- AI backend proxy.
- Production deploy.
- Merge to `main`.
- Firebase rule or data changes.
- Broad calculation extraction.

---

*Visible.. v1.8 — updated June 2026*
*Stack: HTML + vanilla JS + CSS + Firebase + Anthropic Claude API*
