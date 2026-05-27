# Lovable Visual Polish Brief

Use this brief to create visual direction for the `visible..` mobile web app. This is a design/mockup brief, not an implementation brief.

Do not rebuild the app logic. Do not restructure the product. Do not invent a landing page. The goal is to emulate the existing app and make it calmer, clearer, and more polished.

---

## Product Context

`visible..` is a mobile-first personal finance web app for people managing a messy short-term money picture.

It is not a generic budget tracker and should not feel like a corporate banking app. It is closer to a calm interpreter of the week ahead: it helps the user understand whether they are okay, what changed, and what they need to do next.

The user may be stressed, tired, or avoidant around money. The interface should reduce cognitive load and emotional noise.

The most important questions the app should answer are:

- Am I okay until payday?
- What changed since I last checked?
- What do I need to do next?
- Can I stop thinking about this for now?
- Why did that number move?

---

## Current Visual Language

Emulate the existing app rather than redesigning it from scratch.

Current feel:

- Mobile-first financial dashboard
- Warm off-white background
- White cards with subtle borders
- Amber/gold accent for triage, attention, and payday urgency
- Green for safe, paid, and income
- Red for shortfall or urgent attention
- Muted grey for secondary text
- Rounded cards, but not overly soft or bubbly
- Dense enough for repeated daily use
- Practical, personal, and calm
- Typography has confident bold headings, compact uppercase labels, and monospace-style numbers

Avoid:

- Marketing page layouts
- Decorative hero sections
- Generic fintech gradients
- Banking-app clone aesthetics
- Cute or patronising emotional language
- Big empty whitespace that reduces usefulness
- Hiding important financial detail behind decoration

---

## Key Existing Screen Elements

Keep the structure recognisable.

Header:

- `visible..` logo
- `BETA v1.8` pill
- sync or household status pill
- `2D TO PAYDAY` pill
- segmented control: `Triage` / `Payday`

Dashboard components:

- Payday status card
- Next payday income list
- Balance today card
- Budget tracker chart card
- True remaining card
- Plan review card
- Triage bill list
- Bottom mobile nav: `Today` / `Scan` / `Review` / `More`

Horizon section:

- `HORIZON - 3 PAY PERIODS`
- Three stacked period cards:
  - `This period`
  - `Next period`
  - `Period +3`
- Each card can show:
  - projected amount left
  - safe/tight/shortfall state
  - progress bar
  - actual income total for that period
  - committed total
  - bills total
  - lowest point in period
  - extra income note, e.g. `Includes 1 extra Daisy wage (£2,250)`

---

## Design Direction

The current app has useful facts, but the user should not have to interpret everything from charts and numbers.

Make the hierarchy:

1. Answer first
2. Reason second
3. Graph/details third

The app should make the plain-English status more prominent than the graph.

A good top-level status card might say:

```text
You are short by £66 before payday.
One planned payment causes the dip on 22 Jun.
After David wage lands, the next period is stable.
```

Or, when things are okay:

```text
You are covered until payday.
Lowest point is £455 on 22 Jun.
No action needed today.
```

The tone should be calm and factual. It should not shame the user, over-celebrate, or sound like a bank.

---

## Graphs And Simpler Alternatives

Graphs are useful for some users, but not everyone understands them easily, especially under financial stress.

Keep the graph available as supporting evidence, but do not make it the only way to understand the forecast.

Consider adding or emphasising simpler status components:

### Status

A plain-English interpretation of the current situation.

Example:

```text
You are short by £66 before payday.
The low point is 22 Jun.
Dartcharge is the only planned pressure.
```

### What Changed

A compact change summary since the last check.

Example:

```text
Changed since last check
- Balance updated: £1,000 -> £1,200
- Dartcharge moved to payday
- Period +3 increased because Daisy lands twice
```

### Next Action

A single clear instruction.

Example:

```text
Next action
Pay Dartcharge on 29 May when Daisy wage lands.
```

Or:

```text
No action needed today.
Check again after payday.
```

### Details

The chart, horizon cards, and detailed lists can sit underneath for users who want to inspect the numbers.

---

## Horizon Polish Goal

The Horizon section is the priority area to polish.

Make it easier to understand:

- projected balance
- shortfall risk
- lowest point in each period
- extra income events
- why later periods may look higher
- visual difference between safe, tight, and shortfall periods

Example sample data:

```text
Balance today: £1,200
This period: £-66 left, shortfall
Next period: £1,367 left
Period +3: £5,050 left
Daisy wage: £2,250 every 28 days
David wage: £4,750 monthly
Child cred: £100 monthly
Harry Maint: £250 monthly
Extra note: Includes 1 extra Daisy wage (£2,250)
```

The design should make `Period +3` understandable instead of suspicious. If it is high because Daisy lands twice, the card should explain that in plain language.

---

## Mockup Request For Lovable

Create one polished mobile app screen mockup.

Requirements:

- Emulate the current `visible..` app style
- Include the dashboard and Horizon area
- Show the Horizon section clearly
- Include a plain-English status layer above or near the graph
- Include a simple `What changed` or `Next action` treatment if it fits
- Keep the bottom mobile nav
- Keep the app dense enough for daily use
- Use realistic values from the sample data
- Preserve colour roles: amber = attention, green = safe/income, red = shortfall, grey = secondary

Do not:

- Create a marketing landing page
- Redesign the product concept
- Add unrelated features
- Replace the app with a generic budgeting UI
- Hide core financial detail
- Make the graph the only explanation

---

## Implementation Guardrail

If this mockup is later implemented by Claude, Codex, or another assistant, use it as visual reference only.

Implementation should be narrow:

- Do not change calculations
- Do not change localStorage schema
- Do not change Firebase sync
- Do not change AI features
- Do not change app navigation
- Do not rewrite the app
- Apply styling and copy improvements only to existing surfaces unless explicitly requested
