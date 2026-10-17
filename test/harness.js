// Test harness: loads the inline <script> from index.html into a Node vm context
// with a minimal DOM stub and a frozen clock, so the projection maths can be
// exercised without a browser. No dependencies.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractAppScript(html) {
  // The app script is the only inline <script> without a src attribute.
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m, out = '';
  while ((m = re.exec(html))) out += m[1] + '\n';
  return out;
}
const APP_JS = extractAppScript(HTML);

function makeElement() {
  const store = {};
  return new Proxy(function () {}, {
    get(t, k) {
      if (k in store) return store[k];
      if (k === 'style' || k === 'dataset' || k === 'classList') {
        return store[k] = k === 'classList' ? { add() {}, remove() {}, toggle() {} } : {};
      }
      if (k === 'querySelectorAll') return () => [];
      if (k === 'querySelector' || k === 'getContext') return () => null;
      if (typeof k === 'symbol') return undefined;
      if (k === 'innerHTML' || k === 'textContent' || k === 'value' || k === 'className') return '';
      return () => makeElement();
    },
    set(t, k, v) { store[k] = v; return true; },
  });
}

/**
 * Create an app instance.
 * @param {object} opts
 * @param {string} opts.now  local wall-clock time, e.g. '2026-06-10T09:00:00'
 * @param {object} opts.state  fields merged over DEF into S
 * @param {string} [opts.html]  path to an alternative index.html (e.g. the live site) to load instead
 */
function loadApp({ now = '2026-06-10T09:00:00', state = {}, html } = {}) {
  const appJs = html ? extractAppScript(fs.readFileSync(html, 'utf8')) : APP_JS;
  const RealDate = Date;
  const fixed = new RealDate(now).getTime();
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
    static now() { return fixed; }
  }
  const elements = {};
  const document = {
    readyState: 'loading',
    addEventListener() {},
    getElementById(id) { return elements[id] || (elements[id] = makeElement()); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() { return makeElement(); },
    body: makeElement(),
  };
  const storage = {};
  const ctx = {
    Date: FakeDate, Math, JSON, Object, Array, Number, String, Set, Map, Promise, Proxy,
    parseFloat, parseInt, isNaN, Infinity, NaN, console,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    document,
    localStorage: { getItem: k => storage[k] ?? null, setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } },
    navigator: {}, location: { reload() {} }, confirm: () => true, alert() {},
    Intl,
  };
  ctx.window = ctx; ctx.self = ctx;
  ctx.window.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(appJs, ctx, { filename: 'index.html' });
  // test-only helper: local YYYY-MM-DD (independent of the app's own helpers)
  vm.runInContext("function __iso(d){d=new Date(d);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}", ctx);
  ctx.__state = state;
  vm.runInContext('S = Object.assign({}, DEF, JSON.parse(JSON.stringify(__state)));', ctx);
  return {
    ctx,
    elements,
    run: code => vm.runInContext(code, ctx),
    /** innerHTML set on an element by a render function */
    html: id => (elements[id] ? elements[id].innerHTML : ''),
  };
}

module.exports = { loadApp, APP_JS };
