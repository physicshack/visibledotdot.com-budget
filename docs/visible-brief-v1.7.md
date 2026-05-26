# Visible.. — One Page Brief
*What it is, what must work, what's next*

---

## What It Is

**Visible..** is a financial planning app for adults with ADHD. It makes the invisible visible — the cash flow pressure building before payday, the structural gap between income and commitments, the bills that need a decision today.

Core insight: ADHD makes it impossible to hold the full financial picture in working memory while simultaneously deciding what to do about it. Visible.. holds the picture. The user just decides.

Two modes. Plan when calm. Pay on payday. Never both at once.

Live at **visibledotdot.com**. Single HTML file. Firebase household sync. Claude AI analysis and bill scanning.

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

## Must Work — Non-Negotiable

These are the features that define the product. If any of these fail, the app fails.

**1. Dashboard loads correctly on first visit**
- Visible.. logo and BETA V1.7 badge in header
- Plan/Pay mode toggle visible and functional
- All sections render — no blank screen, no error boxes

**2. Balance card**
- Shows current balance with date when set
- Tap to update — saves today's date automatically
- Stale warning after 7 days

**3. Chart — rolling balance projection**
- Starts from last payday (not today)
- Snaps to current balance on its date
- Projects forward using real income dates (not assumed period start)
- 1 / 2 / 3 period toggle works — all sections update together
- Today line visible

**4. Horizon cards — 3 periods**
- "This period" shows current-balance-aware projection (not theoretical)
- Both lowest point AND end-of-period balance shown:
  `↓ £240 on 22 May → £1,408 end`
- Lowest only shown when meaningfully different from end (>£50)
- Tight buffer / shortfall warnings correct

**5. Commitments section**
- Collapsed by default with pie chart
- "+ Add" always visible even when empty
- Expand/collapse works
- All categories including groceries

**6. Income section**
- Collapsed by default with pie chart
- "+ One-time" and "+ Source" both visible in header always
- Expand/collapse works
- One-time income: Edit and Delete on each row

**7. Bill cards**
- Edit button always visible top-right
- Pay / Defer / Skip in Plan mode
- Delete available in Plan mode
- "+ Add bill" button always visible in bills header

**8. AI analysis**
- Spinner shows in narrative card while loading
- Dates in output are real calendar dates, current year
- Payment plans split into separate bills on scan
- Stale warning when decisions change after last analysis

**9. Household sync**
- Syncing pill shows in header
- Firebase writes/reads on state change
- Two devices see same data

**10. Pay mode**
- One bill at a time
- Mark as paid works
- Celebration shows
- Payday update modal after last bill

---

## Architecture Constraints

**chartData is the single source of truth.**
Calculated once at the top of `renderDashboard()`. Never recalculated inside individual render functions. Chart and horizon always consistent.

**renderDashboard() structure:**
1. Calculate chartData
2. Render sections in order — each reads from chartData
3. Each section individually try/caught — one failure can't blank the screen

**State never written during render.**
Render functions are read-only. They read `S`, read `chartData`, write to DOM. Nothing else.

---

## What's Next

| Priority | Item |
|---|---|
| Immediate | Horizon card header showing lowest + end (↓ £X on date → £X end) |
| Soon | GitHub version control setup |
| Soon | Logo image embedded (replacing text rendering) |
| Medium | Partner/simple view — `viewMode: 'standard' \| 'simple'` |
| Medium | Partner view design — pressure gauge + goal icon |
| Later | Visible Admin module |

---

## Development Workflow

1. **Before any session** — export data JSON from app
2. **Build** — Claude writes/modifies code
3. **Check** — GPT-5.5 static analysis on changed file
4. **Verify** — `node --check` syntax validation
5. **Deploy** — upload `index.html` + `sw.js` to Fasthosts
6. **Test** — check on phone at visibledotdot.com
7. **Save** — keep named backup of working file

**Session types:**
- Planning/architecture → low token cost, mobile-friendly
- Code review (excerpt) → low cost
- Full file edit → higher cost, bring specific function not full file
- Debugging → always bring screenshot or error message first

---

*Visible.. v1.7 — May 2026 — visibledotdot.com*
*Module 1 of the Visible.. Executive Function as a Service platform*
