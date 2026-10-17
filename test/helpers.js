'use strict';
const { loadApp } = require('./harness');

/** Strip tags from rendered horizon HTML and parse each period row into numbers. */
function parseHorizon(html) {
  // amounts are rendered with fmtGBP ("−£350"); normalise to "£-350" for parsing
  const text = html.replace(/<br>/g, ' | ').replace(/<[^>]+>/g, ' ').replace(/&pound;/g, '£').replace(/−£/g, '£-').replace(/\s+/g, ' ');
  const names = ['This period', 'Next period', 'Period \\+\\d+'];
  const re = new RegExp('(' + names.join('|') + ')(?:\\s+\\d+ \\w+–\\d+ \\w+)?\\s+£(-?[\\d,.]+) left(.*?)(?=This period|Next period|Period \\+\\d|$)', 'g');
  const num = (s, label) => {
    const m = s.match(new RegExp(label + ' £(-?[\\d,]+)'));
    return m ? Number(m[1].replace(/,/g, '')) : null;
  };
  const rows = [];
  let m;
  while ((m = re.exec(text))) {
    const rest = m[3];
    rows.push({
      label: m[1],
      left: Number(m[2].replace(/,/g, '')),
      start: num(rest, 'Start'),
      income: num(rest, 'Income'),
      committed: num(rest, 'Committed'),
      bills: num(rest, 'Bills'),
      // rendered as "Lowest: £X on Ddd D Mon"; returned as [amount, 'D Mon'] (weekday dropped)
      lowest: (rest.match(/Lowest:? £(-?[\d,]+) on (?:\w{3} )?(\d+ \w+)/) || []).slice(1),
      text: m[0],
    });
  }
  return rows;
}

/** Two-earner household (synthetic): £7,000 income, £5,800 committed per month. */
function householdState(extra = {}) {
  return Object.assign({
    incomeSources: [
      { name: 'Alex', amount: 4000, schedule: 'monthly', nextdate: '2026-06-24' },
      { name: 'Sam', amount: 3000, schedule: 'monthly', nextdate: '2026-06-28' },
    ],
    commitments: [
      { id: 'c_mort', name: 'Mortgage', amount: 1800, category: 'housing', due_type: 'day_of_month', due_value: 1 },
      { id: 'c_ctax', name: 'Council tax', amount: 300, category: 'housing', due_type: 'day_of_month', due_value: 30 },
      { id: 'c_misc', name: 'Everything else', amount: 3700, category: 'other', due_type: 'day_of_month', due_value: 15 },
    ],
  }, extra);
}

function renderHorizon(app) {
  app.run('renderHorizonSection();'); // the horizon builds its own model (it no longer reads chartData)
  return parseHorizon(app.html('horizonSection'));
}

module.exports = { loadApp, parseHorizon, householdState, renderHorizon };
