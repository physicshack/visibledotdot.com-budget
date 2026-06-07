# Visible.. — One Page Brief v1.8
*What it is, what must work, what's next*

---

## What It Is

**Visible..** is a financial planning app for adults with ADHD. It makes the invisible visible: cash-flow pressure before payday, the structural gap between income and commitments, and the bills that need a decision today.

Core insight: ADHD makes it hard to hold the full financial picture in working memory while also deciding what to do about it. Visible.. holds the picture. The user just decides.

Two modes. Plan when calm. Pay on payday. Never both at once.

Live at **visibledotdot.com**. Single HTML app. Firebase household sync. Claude AI analysis and bill scanning.

Current UI label: **BETA v1.8**.

---

## Emotional Design Contract

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

## Voice Rules

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

## Must Work — Non-Negotiable

### 1. Dashboard loads correctly on first visit

- Visible.. logo and BETA v1.8 badge appear in the header.
- Plan/Pay mode toggle is visible and functional.
- All sections render without a blank screen or error box.

### 2. Balance card

- Shows current balance with date when set.
- Tap to update saves today's date automatically.
- Stale warning appears after 7 days.

### 3. Chart — rolling balance projection

- Starts from last payday of the primary income source.
- Snaps to current balance on its recorded date.
- Projects forward using real income dates.
- 1 / 2 / 3 period toggle updates all dependent sections together.
- Chart legend reflects balance health, not bill-decision categories.
- Today line is visible when today is inside the chart range.

### 4. Horizon cards — 3 periods

- This period uses current-balance-aware projection when chart data is available.
- Cards show both lowest point and end-of-period balance where useful.
- Period boundaries end the day before payday.
- Later periods carry forward the prior end balance.
- Income labels reflect actual income events in the period, including extra wage landings.

### 5. Commitments section

- Collapsed by default with pie chart and category table.
- `+ Add` remains visible even when empty.
- Expand/collapse works.
- Categories include groceries.

### 6. Income section

- Collapsed by default with pie chart.
- `+ One-time` and `+ Source` are visible from the header.
- Expand/collapse works.
- One-time income supports edit, receive, and delete flows.

### 7. Bill cards

- Edit button is always visible.
- Pay / Defer / Skip controls are available in Plan mode.
- Delete is available in Plan mode.
- `+ Add bill` remains visible in the bills header.

### 8. AI analysis

- Spinner shows while plan review is loading.
- Dates in output are real calendar dates in the current year.
- Payment plans are split into separate bills on scan.
- Stale warning appears when decisions change after the last analysis.
- Refresh review button remains available when a prior review exists.

### 9. Household sync

- Sync pill shows in the header.
- Firebase writes/reads on state change when configured.
- Two devices can see the same household data.
- v1.8 balance sync includes timestamp handling and balance copy-on-join.

### 10. Pay mode

- Shows one bill at a time.
- Mark as paid works.
- Celebration shows.
- Payday update modal appears after the last bill.

---

## Architecture Constraints

- `chartData` is the single source of truth for projection data.
- `chartData` is calculated once at the top of `renderDashboard()`.
- Chart and horizon sections must read the same projection data.
- Render functions should not mutate state.
- All dynamic user/AI/Firebase content inserted into `innerHTML` must be escaped.
- Do not change `paymind5` or Firebase data structure without explicit approval.

---

## What's Next

| Priority | Item |
|---|---|
| Immediate | Document Firebase security rules |
| Immediate | Fix income source name XSS in inline `onclick` attributes |
| Soon | Replace placeholder PWA icons with branded artwork |
| Medium | Extract calculation logic toward tests |
| Medium | Partner/simple view — `viewMode: 'standard' | 'simple'` |
| Human-only | AI backend proxy |

---

## Development Workflow

1. Read `AGENTS.md`, `docs/ai-handoff.md`, and `docs/task-queue.md`.
2. Work on a branch, not `main`.
3. Keep changes scoped to the queued task.
4. Open a draft PR for review.
5. Use PR comments and `agent:*` labels for Claude/Codex handoff.
6. Do not merge or deploy without the human.

---

*Visible.. v1.8 — June 2026 — visibledotdot.com*
*Module 1 of the Visible.. Executive Function as a Service platform*
