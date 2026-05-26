# Visible.. — Product Specification v1.7
*ADHD-aware financial planning and executive function scaffolding*
*Last updated: May 2026*

---

## 1. Product Vision

### Core Premise

People with ADHD pay an "ADHD tax" of £1,000–£3,000/year — not from lack of income but from the inability to reliably deploy executive function on demand. When a bill arrives and you must simultaneously decide what to do about it and then do it, the activation cost is prohibitive.

Visible.. Finance (Module 1 of the Visible.. Executive Function as a Service platform) breaks this into separate phases:

1. **Plan** — see everything, make decisions (pay / defer / skip) when calm
2. **Pay** — on payday, execute one action at a time with zero distraction

These are different cognitive loads. The app never conflates them.

### Design Principles

- **Lowest possible activation energy** — every interaction is one tap where possible
- **Separate decision from execution** — decide when calm, act when ready
- **Never override user choices** — flag risks once clearly, then respect the decision
- **Progressive disclosure** — collapsed by default, expand when needed
- **ADHD-appropriate feedback** — short, specific, scannable. No walls of text.
- **Real balance as truth** — current balance overrides theoretical projections at its date
- **Single source of truth** — chart data calculated once per render, all sections read from it

## Emotional Design Contract

visible.. exists to help the user feel supported and financially safe enough to act.

Many users arrive dysregulated, avoidant, ashamed, or afraid. The app must not amplify that state. It should calmly sort financial interruptions into clear next actions.

Visible should:
- reduce fear of opening the app
- avoid shame, blame, or dramatic language
- explain consequence without catastrophising
- always pair risk with a next safe action
- show what can wait as clearly as what needs action
- remember decisions so the user does not have to
- end each session with a calm handoff

The desired start state is:
“I trust Visible.. not to scare me. It will help me make a realistic plan with minimal stress.”

The desired end state is:
“I know where I am. I know what happens next. I do not have to hold this in my head.”

The desired emotional end state is:
“I’ve got this. I’m okay.”

## Voice Rules

Visible is calm, concise, specific, and protective.

Use:
- Needs attention
- Safest next step
- Okay to wait
- Scheduled
- Contact first
- You’re up to date
- Best next steps
- best no to pay early
- Best handled today

Avoid:
- Danger
- Critical
- Failure
- Panic
- Urgent unless truly time-sensitive
- Long explanations by default
---


### Brand

**Visible..** — making the invisible visible. The double dot is a brand device: the pause before clarity. Navy dot (known/present) + amber dot (emerging/becoming visible).

Domain: visibledotdot.com
Hosted: Fasthosts
Firebase: paymind-b1d51-default-rtdb.europe-west1.firebasedatabase.app

---

## 2. Architecture

### Single-file HTML App
- One `.html` file — no build tools, no install, no server
- Vanilla JavaScript throughout
- CSS custom properties for theming (warm cream palette)
- Hosted on any HTTPS server (required for camera access)
- Deploy by uploading `paymind-v1.7.html` renamed to `index.html`

### Data Storage
- **localStorage** — primary store, key `paymind5`
- **Firebase Realtime Database** — household sync (optional, default URL pre-configured)
- No server-side storage of user financial data

### External Dependencies
- **Chart.js 4.4.0** — balance projection chart (CDN, loads first)
- **Firebase 9.23.0 compat** — household sync (CDN, deferred)
- **Anthropic Claude API** — camera scanning and AI analysis (direct browser fetch)
- **Google Fonts** — Syne + Syne Mono

### API Configuration
- Model: `claude-sonnet-4-6`
- Scan: max 1,500 tokens
- Analysis: max 4,000 tokens
- Budget health check: max 1,500 tokens
- Built-in API key (rotatable in Settings → Advanced)
- Built-in Firebase URL (overridable in Settings)

---

## 3. State Model

All state lives in one `S` object, serialised to localStorage and synced via Firebase.

```javascript
S = {
  // Config
  apiKey: '',
  firebaseUrl: '',
  deviceId: '',
  deviceName: 'Me',

  // Income
  incomeSources: [{
    name, amount,
    schedule,     // weekly | biweekly | 4weekly | monthly | 1st15th
    nextdate      // YYYY-MM-DD — next payday date
  }],
  oneOffIncome: [{
    id, title, amount, date,
    received,     // true once marked received
    notes
  }],

  // Bills (unplanned / ad-hoc)
  bills: [{
    id, title, sender, type,
    amount, due_date,
    urgency,            // urgent | high | medium | low
    urgency_reason, summary, consequence,
    recommendation, sensitivity, priority_rank,
    category,
    paid, paidDate,
    added
  }],

  // Decisions
  decisions: {},        // billId → pay | defer | skip
  planDates: {},        // billId → intended payment date (chart placement)
  instalments: {},      // billId → [{id, date, amount, paid}]
  decisionsChanged: '',

  // Commitments (regular outgoings)
  commitments: [{
    id, name, amount, category,
    due_type,     // day_of_month | days_after_payday
    due_value,
    source        // estimated | confirmed
  }],
  paidCommitments: {},  // periodKey → {commId: bool}
  lastActuals: {},      // commId → {amount, date}

  // Balance
  currentBalance: null,
  currentBalanceDate: '',

  // Analysis
  narrative: '',
  narrativeDate: '',
  narrativeChangedAt: '',
  observationCards: [],
  observationsGenerated: '',

  // Household
  household: {
    household_code, created_by, created_at,
    members: [{device_id, name, joined_at}]
  },

  // UI
  goals: '',
  alertRadius: 5,
  dismissedAlerts: [],
  showPaid: false,
  balDashOpen: true,
  balHorizon: 1,        // 1=35d, 2=65d, 3=95d
  commCollapsed: true,
  incomeCollapsed: true,
  history: []
}
```

### Module-level computed state

```javascript
let chartData = null;  // Populated once at top of renderDashboard()
                       // Read by: renderBalDash, renderHorizonSection
                       // Never written by individual render functions
```

---

## 4. Two-Mode Flow

### Mode: Plan (default)
Full dashboard showing all financial information and decision tools:
- Payday countdown with all income sources and days remaining
- Balance card (tap to update current balance)
- Four tiles: Bills Due · Urgent · Committed · Planned Buffer
- Balance projection chart (rolling period from last payday)
- True remaining bar (income minus commitments minus planned bills)
- AI analysis narrative with stale-detection and re-analyse button
- Bill cards (Pay / Defer / Skip + Edit / Delete)
- Commitments section (collapsible, category pie chart)
- Income section (collapsible, income pie chart + one-time income)
- Horizon — 3 pay periods (current-balance-aware, shows lowest point + end balance)
- Next action card

### Mode: Pay (payday only)
Minimal execution view — zero distraction:
- Single bill at a time
- One large "Mark as Paid ✓" button
- Progress dots showing position in queue
- Only bills with `decision = 'pay'` appear
- Celebration overlay with confetti on payment
- After last bill: payday update modal to advance next dates
- Period history snapshot recorded
- Returns to Plan mode automatically

### Switching
Segmented control (Plan / Pay) always visible. User can override manually at any time.

---

## 5. Chart — Rolling Balance Projection

### Single Source of Truth Architecture

`buildDailyBalances(horizonDays)` is called **once** at the top of `renderDashboard()`, before any section renders. The result is stored in the module-level `chartData` variable. All sections that need financial projection data read from `chartData` — they never recalculate independently.

This ensures:
- Chart and horizon cards always show consistent data
- Period toggle (1/2/3) triggers `renderDashboard()` so all sections update together
- `buildDailyBalances` runs once per render, not once per consuming section

### Period Model
- **Period start** = last payday of the primary income source (largest amount)
- Calculated by walking back from `src.nextdate` using `stepBack()` until date ≤ today
- Chart always starts from period start, not from today
- Toggle: 1 / 2 / 3 periods (35 / 65 / 95 days forward)

### Balance Model
1. Start at £0 from period start
2. Income events: each source stepped forward from first payday on or after period start
3. Commitment events: one instance per month per commitment, from period start through horizon
4. Bill events: placed on their plan date
5. **Current balance snap**: on the balance date, running total replaced with real balance. Prior events discarded. Forward projection continues from real balance.

### Event Types and Colours
| Event | Colour | Style |
|---|---|---|
| Income payday | Green spike | Solid |
| Bill — pay | Green bar | Solid |
| Bill — deferred | Amber bar | Dashed |
| Bill — undecided | Blue bar | Solid |
| Bill — paid | Grey bar | Solid |
| Commitment | Amber bar | Solid |
| One-off income pending | Green bar | Dashed |
| One-off income received | Green bar | Solid |
| Today | Red vertical line | Dashed |

### Summary Stats (above chart)
- **Balance/Income**: current balance if set, otherwise one period's income
- **Going out**: one period's committed + planned bills
- **Lowest**: minimum projected balance and the date it occurs

---

## 6. Horizon Section — 3 Pay Periods

Shows three forward periods, each card containing:

### Header line
```
This period          ↓ £240 on 22 May → £1,408 end
```
Both the **lowest point** (cash crunch moment) and **end of period balance** (carry-forward) are shown. Lowest point only shown when meaningfully lower than end balance (>£50 difference).

### Detail line
Income £X · Committed £X · Bills £X
Bills listed by name if present.
One-time income listed if present.

### Colour states
- **Green**: comfortable buffer
- **Amber/tight**: buffer < 10% of period income
- **Red/negative**: shortfall

### Data source
Period 0 (this period): reads from `chartData` — current-balance-aware, real income timing
Periods 1 and 2: theoretical calculation (chartData may not extend that far)
Both fall back to theoretical if chartData unavailable.

---

## 7. Commitments Section

Regular monthly outgoings — rent, subscriptions, insurance, car payments etc.

### Collapsed view (default)
- SVG pie chart by category with leader-line labels
- Category table with amounts
- Unplanned bills as a separate "📋 unplanned" slice
- Paid categories faded (30% opacity)
- "+ Add" button always visible in header

### Expanded view
- Full list sorted by due day ascending, then amount descending
- Each row: icon, name, due day, amount, Edit, pay/✓ toggle
- Paid status resets each period (keyed by next payday date)
- "+ Add" inline form always accessible

### Categories
housing · transport · credit · communication · entertainment · utilities · groceries · pets · other · unplanned

---

## 8. Income Section

### Collapsed view (default)
- SVG pie chart per source with unique colours + one-time income slice
- Table: source name, amount, day-number display
  - Monthly → "24th" · 1st15th → "1st · 15th" · Weekly → "every 7d" · Biweekly → "every 14d" · 4-weekly → "every 28d"
- "+ One-time" and "+ Source" buttons always visible in header

### Expanded view
- Recurring income rows with Edit button
- One-time income subsection
- Each one-time row: title, date, amount, Edit, Receive (pending) / Del (received)
- Inline "+ Add one-time income" form

---

## 9. Bill Cards

### Structure
- Urgency bar (coloured left border)
- Category icon, title, sender, due date, amount
- Edit button top-right — always visible
- Urgency tag, priority rank, decision tag
- AI recommendation (italic)

### Plan mode controls
- Pay ✓ / Defer → / Skip buttons
- Consequence box (shows on defer or urgent)
- Deferral risk warning for urgent/high bills
- Plan date picker (when you intend to pay — drives chart placement)
- Instalment entry when deferred
- Edit and Delete buttons below decision controls

### Pay mode controls
- "Mark as Paid ✓" — large, single action
- Celebration overlay on payment

### Manual add (always available)
"+ Add bill" button in bills section header opens inline form:
- Description, amount, due date, category, urgency, sender

---

## 10. AI Analysis

### Situational Analysis
Triggered by: bill import (400ms auto-delay), manual button, decisions-changed stale detection.

**Prompt rules:**
- Today's date and year explicitly included — never assume 2025
- Use true_buffer not gross income
- All dates must be real calendar dates
- Respect deferred/skip decisions
- No preamble, no repetition

**Output:** JSON → `bills[]` with priority ranking + `narrative` (3 bullets, 15 words max each)

**Display:** Spinner in narrative card area during API call. Result replaces spinner. Stale warning if decisions change after last analysis.

### Scan Prompt Rules
- Payment plans / instalments: split into separate items per payment — never sum totals
- Inbound → oneOffIncome[], outbound → bills[]
- Category includes groceries

### Budget Health Check
3–5 observation cards: high commitments vs market, missing categories, switching opportunities, structural risks. Dismissible. Regenerated on next "Check My Budget" run.

---

## 11. Alerts

Dismissible stack at dashboard top.

| Alert | Colour | Condition |
|---|---|---|
| Payday today | Red | days = 0 |
| Payday soon | Amber | days ≤ 4 |
| Bill overdue | Red | past due, unpaid |
| Bill due today | Red | due today, unpaid |
| Bill due tomorrow | Amber | due tomorrow |
| Bill within radius | Blue | within alertRadius days |
| Urgent no decision | Red | urgency=urgent, no decision |

---

## 12. Household Sync

- Firebase Realtime Database, real-time listener
- Device A creates household → 6-char code
- Device B enters code → joins
- Writes on every `save()`, ignores own writes via `lastDevice`
- Sync payload: bills, commitments, decisions, planDates, instalments, incomeSources, narrative, goals, household, currentBalance, currentBalanceDate, lastActuals, oneOffIncome, observationCards

---

## 13. Camera / Scan

1. Tap Scan → camera permission
2. Live viewfinder with guide frame
3. Capture or gallery pick → image preview
4. Analyse with Claude → base64 image to API
5. Results shown — split payment plans into separate bills
6. Import → auto-analysis → dashboard

---

## 14. Onboarding

Minimal path: income source (name, amount, schedule, next payday date) → "Let's go →"

Optional: regular commitments (chip quick-add + custom), financial goals.

---

## 15. Settings

**Main:** Household Sync · Notifications · Personal Goals · Send Feedback

**Advanced:** API Key · Alert Radius · Firebase Diagnostics · Period History · Data Export/Import · Clear All Data

**On dashboard (not in settings):** income sources · commitments · current balance

---

## 16. Technical Architecture

### Key Functions
| Function | Purpose |
|---|---|
| `buildDailyBalances(horizonDays)` | Single source of truth — rolling period, balance snap, income events |
| `buildChartEvents(horizonDays, periodStart)` | Commitment and bill events from period start |
| `stepBack(date, schedule)` | Walk one period backwards (all 5 schedule types) |
| `stepForward(date, schedule)` | Walk one period forwards |
| `nextPayday(src, after?)` | Next payday occurrence for an income source |
| `nearestPayday()` | Closest upcoming payday across all sources |
| `totalCommitted()` | Sum of all commitment amounts |
| `trueBuffer()` | Income − committed − planned bills |
| `renderDashboard()` | Calculates chartData first, then renders all sections |
| `buildAnalysisPrompt()` | Lean JSON prompt with year context, real dates |
| `importPlan(data, fromDirect)` | Applies AI response without triggering full re-render |

### Reliability Patterns
- `chartData` calculated once at top of `renderDashboard()` — never inside individual render functions
- Every render section individually try/caught
- All `getElementById` calls null-checked before use
- `buildPieSVG()` filters NaN/zero slices
- `renderDashboard()` outer try/catch shows red error box with message rather than blank screen
- GPT-5.5 static analysis pass after any significant rebuild

### Known Technical Debt
- Firebase rules open (`read/write: true`) — needs auth before public launch
- API key embedded in source — acceptable for private beta
- No GitHub version control yet — manual file versioning
- Single file architecture — no build step, no module isolation

---

## 17. Deployment

- **Domain**: visibledotdot.com (Fasthosts)
- **Firebase**: paymind-b1d51-default-rtdb.europe-west1.firebasedatabase.app
- **Deploy**: upload `paymind-v1.7.html` as `index.html` + `sw.js` to Fasthosts root

### Pre-deploy checklist
1. Export data JSON from app (Import → Advanced → Export)
2. Run GPT static analysis on changed file
3. Syntax check: `node --check` on extracted script
4. Test on phone before deploying to live domain
5. Keep last working file as named backup

---

## 18. Roadmap

### Next (pending)
- Horizon card header: show both lowest point and end-of-period balance
- GitHub setup for version control
- Logo image embedded (base64) replacing text rendering
- Partner view (simple mode) — `viewMode: 'standard' | 'simple'`

### Medium term
- Partner view: pressure gauge / goal icon visual model
- Verify 4-weekly (Daisy wage) chart accuracy over multiple periods
- Verify 1st15th schedule chart accuracy
- Budget health cards — refine quality
- Notification service worker — payday eve reminder

### Longer term
- Visible Admin module (Module 2)
- Visible Business module (Module 3)
- Native mobile app
- Academic outcome study partnership

---

*Visible.. v1.7 — built May 2026*
*Stack: HTML + vanilla JS + CSS + Firebase + Anthropic Claude API*
*Lines: ~4,000 | Size: ~220KB | Deployed: visibledotdot.com*
