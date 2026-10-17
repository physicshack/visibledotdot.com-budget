# Projection rules

These are the rules the balance chart and the horizon follow. Each one has tests in `test/`.

## Paid bills (what counts as "already in the balance")

A bill marked paid has already left the account, so it is never placed on a future date.

| Bill | Treatment |
|---|---|
| Paid, **no `paidDate`** | Assumed already reflected in the recorded balance. **Never deducted.** |
| Paid, `paidDate` **on or before** the balance date | Paid before the balance was entered, so it is already in the balance. Not deducted. |
| Paid, `paidDate` **after** the balance date | Deducted once, on `paidDate`. |
| Paid, `paidDate` **in the future** | Deducted once, on today's date. |
| Paid, no balance recorded | Deducted on `paidDate` if that falls inside the charted range. If there is no `paidDate`, it is not deducted. |

Why "no `paidDate` means already in the balance": before this version no build of the app set `paidDate` when you marked a bill paid. The live build, and every build in this repo's history, only ever wrote `paidDate:''`, when a bill was added. So for almost all existing paid bills the payment date is unknown.

Taking them off again on their plan date double-counts them. That was the bug: an already-paid council-tax bill was deducted again on its plan date.

The trade-off is that a bill paid *after* the balance was last entered, but before this version, is never deducted. That error makes the forecast too high, and it lasts only until you next update your balance.

From this version on, *Mark paid* records today as `paidDate`, and *Unmark* clears it.

## Unpaid bills

- An overdue unpaid bill is assumed due **today**.
- An undated bill is placed on the **last day of This period**: the day before the main earner's next payday.
- Unpaid bills and instalments dated on or before the balance date are **not** treated as already in the balance.

## Recorded balance

- A balance 35 days old or less anchors the projection. Flows dated on or before it are taken as already in it.
- A **positive** balance older than 35 days is ignored, and Start shows £0 with a warning. Rolling a months-old figure forward would pile up months of modelled surplus.
- A **negative** balance (overdraft) older than 35 days is carried in unchanged as the Start of This period. It is flagged as an estimate. Dropping it would move the forecast up by the size of the overdraft.

## Pay periods and paydays

- Periods follow the **main earner**, meaning the largest single payment. A period runs from their payday to the day before their next payday.
- Monthly paydays keep their anchor day: the 31st becomes 28 Feb, then 31 Mar.
- The anchor is stored as `payDay` when the payday prompt saves a short-month date, and when you edit the next payday to a month-end date in a short month.
- On payday, the end-of-payday prompt shows today as the last payday and suggests the next one.
- **Pay mode** opens automatically once, on the main earner's payday. After that, Plan and Pay switch freely. A partner's payday doesn't switch modes.

## Paid ticks on commitments

Ticks are stored per period under the main earner's next payday, as a local date. Ticks written by older builds are still recognised, using that build's key: the nearest payday of any source strictly after today, as a UTC date. On payday the previous period's ticks therefore don't carry over.

## Commitments pie and period low point (v1.8.2)

- With income set up, the commitments pie shows **This period** from the same horizon row that prints "£X left": committed by category, bills, and a **remaining** slice equal to that row's "£X left". It is not recalculated. Because each row satisfies start + income − committed − bills = left, the slices total start + income, which is the period's income when nothing is carried in.
- If "£X left" is below zero there is no remaining slice and a red **Over by £X** label shows under the pie. At exactly £0 the label says nothing is left.
- Without income sources there are no periods, so the pie keeps its old monthly view (commitments + unplanned bills) with no remaining slice.
- Each horizon row shows **Lowest: £X on Ddd D Mon**: the minimum of the chart's day-by-day balance walk from max(today, period start, balance date) to the period end. It is red below £0 and amber below the chart's Tight line (10% of income). With no usable balance it shows "—".

Tests: `test/pie-lowpoint.test.js`.
