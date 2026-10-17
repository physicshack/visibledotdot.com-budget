#!/usr/bin/env node
// Replay a real household export through the projection maths, offline.
//   1. In the app: More → Advanced → Data → Export JSON   (or save the Firebase households/<code> node)
//   2. TZ=Europe/London node test/replay.js paymind-export.json [--now 2026-06-10T09:00] [--html path/to/other/index.html] [--date '22 Jun'] [--labels]
// Prints the horizon rows and chart summary exactly as the given index.html computes them.
// Read-only: nothing is written anywhere.
'use strict';
const fs = require('fs');
const { loadApp } = require('./harness');
const { parseHorizon } = require('./helpers');

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !/^\d{4}-/.test(a) && !a.endsWith('.html'));
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
if (!file) { console.error('usage: node test/replay.js export.json [--now YYYY-MM-DDTHH:MM] [--html index.html]'); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const state = raw.S || raw; // app export is the S object; a Firebase node has the same fields
delete state.household; // never reconnect to the live household
// default: the LOCAL wall clock (toISOString() would be UTC — an hour behind in BST)
const pad = n => String(n).padStart(2, '0');
const d0 = new Date();
const now = opt('now') || `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}T${pad(d0.getHours())}:${pad(d0.getMinutes())}`;
const app = loadApp({ now, state, html: opt('html') });

const h = state.balHorizon || 1;
const days = app.run(`typeof periodHorizonDays==='function'?periodHorizonDays(${h}):(${h}===1?35:${h}===2?65:95)`);
const cd = app.run(`chartData=buildDailyBalances(${days}); chartData`);
app.run('renderHorizonSection()');
console.log('now:', now, ' horizon setting:', h, 'period(s)');
console.log('balance:', state.currentBalance, 'on', state.currentBalanceDate);
console.log('chart:', cd.labels[0], '→', cd.labels[cd.labels.length - 1], ' lowest', cd.lowest, 'on', cd.lowestDate, ' going out', cd.totalOut);
// Rows are printed as figures only; pass --labels to include bill / income names (keep those out of shared docs)
const showLabels = args.includes('--labels');
for (const r of parseHorizon(app.html('horizonSection'))) {
  if (showLabels) console.log(' ', r.text.trim());
  else console.log(' ', r.label, { left: r.left, start: r.start, income: r.income, committed: r.committed, bills: r.bills, lowest: r.lowest.join(' on ') || null });
}
const q = opt('date');
if (q) console.log(`projected balance on ${q}:`, cd.values[cd.labels.indexOf(q)]);
